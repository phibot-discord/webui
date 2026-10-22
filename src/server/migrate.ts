import {
	type CloudRow,
	type CloudSave,
	CloudSessionError,
	CloudWriteError,
	downloadSaveZip,
	latestRow,
	readCloudSave,
	type SaveUpload,
	uploadCloudSave,
	verifyCloudSave,
} from "@/phi/lib/cloud-save";
import { kvKey } from "@/phi/lib/const";
import { Summary } from "@/phi/lib/phigros";
import {
	asSessionToken,
	blobRegion,
	getToken,
	readSaveRaw,
} from "@/phi/lib/saves";
import { isTapApiFailure } from "@/phi/lib/tapapi";
import {
	parseQrStored,
	QR_PENDING,
	type QrResume,
	qrPngAt,
	qrSucceeded,
	requestQr,
} from "./bind";
import { type DataHost, getDataHost } from "./data-host";
import { logger, withDiscordUid } from "./logger";

export type Slot = "from" | "to";
export type Server = "cn" | "gb";

export function asSlot(raw: unknown): Slot | undefined {
	return raw === "from" || raw === "to" ? raw : undefined;
}

function asServer(raw: unknown): Server {
	return raw === "gb" || raw === "global" ? "gb" : "cn";
}

const QR_KEY = (userId: string, slot: Slot) =>
	kvKey("webMigrateQr", userId, slot);
const QR_LOCK = (userId: string, slot: Slot) =>
	kvKey("webMigrateQrLock", userId, slot);
/** Both session tokens between sign-in and the copy; never sent to the browser */
const STATE_KEY = (userId: string) => kvKey("webMigrate", userId);
const RUN_LOCK = (userId: string) => kvKey("webMigrateLock", userId);
/** The To row as it was before PhiBot first wrote it, for a restore by hand */
const UNDO_KEY = (userId: string, server: Server, account: string) =>
	kvKey("webMigrateUndo", userId, server, account);
const STATE_TTL_MS = 15 * 60_000;
const LOCK_MS = 3 * 60_000;
const UNDO_TTL_MS = 30 * 24 * 60 * 60_000;
const NO_ROW = "none";

export type MigrateErr = {
	error:
		| "not_bound"
		| "invalid_token"
		| "qr_expired"
		| "qr_busy"
		| "tapapi_unavailable"
		| "migrate_rejected"
		| "migrate_no_source_save"
		| "migrate_same_account"
		| "migrate_expired"
		| "migrate_busy"
		| "migrate_changed"
		| "migrate_failed"
		| "migrate_unverified";
	status: number;
	detail?: string;
};

export type SaveSide = {
	server: Server;
	player: string;
	hasSave: boolean;
	rks?: number;
	challengeModeRank?: number;
	gameVersion?: number;
	modifiedAt?: string;
};

export type MigratePreview = {
	from: SaveSide;
	to: SaveSide;
	newer: boolean;
	toIsBound: boolean;
};

type Account = { token: string; global: boolean };
type State = {
	from?: Account;
	to?: Account;
	revs?: { from: string; to: string };
};

export type BoundAccount = {
	server?: Server;
	player?: string;
	rks?: number;
};

/** From the cached blob only, for the page: no TapTap call */
export async function boundAccount(
	userId: string,
): Promise<BoundAccount | undefined> {
	const host = await getDataHost();
	const token = await getToken(host.rt, userId);
	if (!token) return;
	const raw = await readSaveRaw(host.db, token);
	const region = blobRegion(raw);
	const out: BoundAccount = {
		server: region == null ? undefined : region ? "gb" : "cn",
	};
	try {
		const blob = JSON.parse(raw ?? "{}") as {
			saveInfo?: {
				PlayerId?: unknown;
				summary?: { rankingScore?: unknown };
			};
		};
		const player = blob.saveInfo?.PlayerId;
		const rks = blob.saveInfo?.summary?.rankingScore;
		if (typeof player === "string" && player) out.player = player;
		if (typeof rks === "number" && Number.isFinite(rks)) out.rks = rks;
	} catch {
		/* an unreadable blob still shows the server */
	}
	return out;
}

function failMigrate(err: unknown): MigrateErr {
	logger.error("migrate failed", err instanceof Error ? err : String(err));
	if (isTapApiFailure(err)) return { error: "tapapi_unavailable", status: 502 };
	const msg = err instanceof Error ? err.message : String(err);
	return { error: "migrate_failed", status: 502, detail: msg || undefined };
}

function unverified(err: unknown): MigrateErr {
	logger.error("migrate unverified", err instanceof Error ? err : String(err));
	const msg = err instanceof Error ? err.message : String(err);
	return { error: "migrate_unverified", status: 502, detail: msg || undefined };
}

function rowRev(row: CloudRow | undefined): string {
	if (!row) return NO_ROW;
	return `${row.objectId}:${row.gameFile?.objectId ?? ""}:${row.modifiedAt?.iso ?? row.updatedAt ?? ""}`;
}

function serverOf(account: Account): Server {
	return account.global ? "gb" : "cn";
}

function side(
	account: Account,
	save: CloudSave,
	row: CloudRow | undefined,
): SaveSide {
	const base: SaveSide = {
		server: serverOf(account),
		player: save.nickname || "",
		hasSave: Boolean(row),
	};
	if (!row) return base;
	let summary: Summary | undefined;
	try {
		summary = new Summary(row.summary);
	} catch {
		summary = undefined;
	}
	const rks = summary?.rankingScore;
	return {
		...base,
		rks: typeof rks === "number" && Number.isFinite(rks) ? rks : undefined,
		challengeModeRank: summary?.challengeModeRank,
		gameVersion: summary?.gameVersion,
		modifiedAt: row.modifiedAt?.iso ?? row.updatedAt,
	};
}

async function readAccount(
	account: Account,
): Promise<{ save: CloudSave; row?: CloudRow } | MigrateErr> {
	try {
		const save = await readCloudSave(account.token, account.global);
		return { save, row: latestRow(save.rows) };
	} catch (err) {
		if (err instanceof CloudSessionError)
			return { error: "migrate_rejected", status: 400 };
		return failMigrate(err);
	}
}

type Pair = {
	from: Account;
	to: Account;
	fromSave: CloudSave;
	fromRow: CloudRow;
	toSave: CloudSave;
	toRow?: CloudRow;
};

async function readPair(from: Account, to: Account): Promise<Pair | MigrateErr> {
	const [a, b] = await Promise.all([readAccount(from), readAccount(to)]);
	if ("error" in a) return a;
	if ("error" in b) return b;
	if (!a.row?.gameFile?.url)
		return { error: "migrate_no_source_save", status: 409 };
	if (from.global === to.global && a.save.userId === b.save.userId)
		return { error: "migrate_same_account", status: 409 };
	return {
		from,
		to,
		fromSave: a.save,
		fromRow: a.row,
		toSave: b.save,
		toRow: b.row,
	};
}

async function preview(
	host: DataHost,
	userId: string,
	pair: Pair,
): Promise<MigratePreview> {
	const from = side(pair.from, pair.fromSave, pair.fromRow);
	const to = side(pair.to, pair.toSave, pair.toRow);
	return {
		from,
		to,
		newer: to.hasSave && (from.gameVersion ?? 0) > (to.gameVersion ?? 0),
		toIsBound: (await getToken(host.rt, userId)) === pair.to.token,
	};
}

async function readState(host: DataHost, userId: string): Promise<State> {
	const raw = await host.db.get(STATE_KEY(userId));
	if (!raw) return {};
	try {
		const state = JSON.parse(raw) as State;
		return state && typeof state === "object" ? state : {};
	} catch {
		return {};
	}
}

function writeState(host: DataHost, userId: string, state: State) {
	return host.db.set(STATE_KEY(userId), JSON.stringify(state), STATE_TTL_MS);
}

export type SlotReady = { side: SaveSide; preview?: MigratePreview };

/** From: its save must exist, and To starts over. To: needs From, then both are read for the preview */
async function connectSlot(
	host: DataHost,
	userId: string,
	slot: Slot,
	account: Account,
): Promise<SlotReady | MigrateErr> {
	if (slot === "from") {
		const read = await readAccount(account);
		if ("error" in read) return read;
		if (!read.row?.gameFile?.url)
			return { error: "migrate_no_source_save", status: 409 };
		await writeState(host, userId, { from: account });
		return { side: side(account, read.save, read.row) };
	}
	const state = await readState(host, userId);
	if (!state.from) return { error: "migrate_expired", status: 410 };
	const pair = await readPair(state.from, account);
	if ("error" in pair) return pair;
	await writeState(host, userId, {
		from: state.from,
		to: account,
		revs: { from: rowRev(pair.fromRow), to: rowRev(pair.toRow) },
	});
	const view = await preview(host, userId, pair);
	return { side: view.to, preview: view };
}

/** The bound account as From; its server comes off the blob, else CN is tried before Global */
export async function boundAsFrom(
	userId: string,
): Promise<SlotReady | MigrateErr> {
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const token = await getToken(host.rt, userId);
		if (!token) return { error: "not_bound", status: 409 };
		const region = blobRegion(await readSaveRaw(host.db, token));
		try {
			if (region != null)
				return await connectSlot(host, userId, "from", {
					token,
					global: region,
				});
			const cn = await connectSlot(host, userId, "from", {
				token,
				global: false,
			});
			if (!("error" in cn) || cn.error !== "migrate_rejected") return cn;
			return await connectSlot(host, userId, "from", { token, global: true });
		} catch (err) {
			return failMigrate(err);
		}
	});
}

export async function startMigrateQr(
	userId: string,
	slot: Slot,
	server: unknown,
): Promise<
	{ expiresIn: number; intervalMs: number; openUrl: string } | MigrateErr
> {
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		await clearMigrateQr(userId, slot);
		try {
			const { stored, ...shown } = await requestQr(
				host.rt,
				asServer(server) === "gb",
			);
			await host.db.set(
				QR_KEY(userId, slot),
				JSON.stringify(stored),
				shown.expiresIn * 1000,
			);
			return shown;
		} catch (err) {
			return failMigrate(err);
		}
	});
}

export function migrateQrPng(userId: string, slot: Slot) {
	return qrPngAt(QR_KEY(userId, slot));
}

export async function peekMigrateQr(
	userId: string,
	slot: Slot,
): Promise<{ status: "waiting" | "scanned" } | MigrateErr | QrResume> {
	const host = await getDataHost();
	const stored = parseQrStored(await host.db.get(QR_KEY(userId, slot)));
	if (!stored) return { error: "qr_expired", status: 410 };
	const useGlobal = stored.global === true;
	const result = await host.rt.getQRcode.checkQRCodeResult(stored, useGlobal);
	if (qrSucceeded(result) && result) return { resume: { result, useGlobal } };
	const err = result?.data?.error;
	if (err === "authorization_waiting") return { status: "scanned" };
	if (err != null && !QR_PENDING.has(err)) {
		if (await host.store.get(QR_LOCK(userId, slot)))
			return { status: "scanned" };
		await host.db.del(QR_KEY(userId, slot)).catch(() => undefined);
		return { error: "qr_expired", status: 410 };
	}
	return { status: "waiting" };
}

export async function finishMigrateQr(
	userId: string,
	slot: Slot,
	resume: QrResume["resume"],
): Promise<SlotReady | MigrateErr> {
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const locked = await host.store.set(QR_LOCK(userId, slot), "1", {
			nx: true,
			ttlMs: LOCK_MS,
		});
		if (locked !== "OK") return { error: "qr_busy", status: 409 };
		try {
			let token: string;
			try {
				token = String(
					(await host.rt.getQRcode.getSessionToken(
						resume.result,
						resume.useGlobal,
					)) || "",
				).replace(/\s/g, "");
			} catch (err) {
				return failMigrate(err);
			}
			if (!/^[a-z0-9A-Z]{25}$/.test(token))
				return { error: "invalid_token", status: 400 };
			return await connectSlot(host, userId, slot, {
				token,
				global: resume.useGlobal,
			}).catch(failMigrate);
		} finally {
			await host.db.del(QR_KEY(userId, slot)).catch(() => undefined);
			await host.store.del(QR_LOCK(userId, slot)).catch(() => 0);
		}
	});
}

export async function connectMigrateToken(
	userId: string,
	slot: Slot,
	rawToken: unknown,
	server: unknown,
): Promise<SlotReady | MigrateErr> {
	return withDiscordUid(userId, async () => {
		const token = String(rawToken || "").replace(/\s/g, "");
		if (!/^[a-z0-9A-Z]{25}$/.test(token))
			return { error: "invalid_token", status: 400 };
		const host = await getDataHost();
		await host.db.del(QR_KEY(userId, slot)).catch(() => undefined);
		try {
			return await connectSlot(host, userId, slot, {
				token,
				global: asServer(server) === "gb",
			});
		} catch (err) {
			return failMigrate(err);
		}
	});
}

export type MigrateDone = {
	status: "done";
	to: SaveSide;
	toIsBound: boolean;
};

export async function runMigrate(
	userId: string,
): Promise<MigrateDone | (MigrateErr & { preview?: MigratePreview })> {
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const locked = await host.store.set(RUN_LOCK(userId), "1", {
			nx: true,
			ttlMs: LOCK_MS,
		});
		if (locked !== "OK") return { error: "migrate_busy", status: 409 };
		try {
			return await runMigrateFor(host, userId);
		} catch (err) {
			return failMigrate(err);
		} finally {
			await host.store.del(RUN_LOCK(userId)).catch(() => 0);
		}
	});
}

async function runMigrateFor(
	host: DataHost,
	userId: string,
): Promise<MigrateDone | (MigrateErr & { preview?: MigratePreview })> {
	const state = await readState(host, userId);
	if (!state.from || !state.to || !state.revs)
		return { error: "migrate_expired", status: 410 };
	const pair = await readPair(state.from, state.to);
	if ("error" in pair) return pair;
	const revs = { from: rowRev(pair.fromRow), to: rowRev(pair.toRow) };
	if (revs.from !== state.revs.from || revs.to !== state.revs.to) {
		await writeState(host, userId, { ...state, revs });
		return {
			error: "migrate_changed",
			status: 409,
			preview: await preview(host, userId, pair),
		};
	}
	const zip = await downloadSaveZip(pair.fromRow.gameFile?.url ?? "");
	const toServer = serverOf(pair.to);
	await host.store.set(
		UNDO_KEY(userId, toServer, pair.toSave.userId),
		JSON.stringify({
			at: new Date().toISOString(),
			server: toServer,
			user: pair.toSave.userId,
			row: pair.toRow?.objectId ?? null,
			gameFile: pair.toRow?.gameFile?.objectId,
			url: pair.toRow?.gameFile?.url,
			summary: pair.toRow?.summary,
			modifiedAt: pair.toRow?.modifiedAt?.iso,
		}),
		{ nx: true, ttlMs: UNDO_TTL_MS },
	);
	const upload: SaveUpload = {
		userId: pair.toSave.userId,
		rowId: pair.toRow?.objectId,
		zip,
		summary: pair.fromRow.summary,
	};
	let written: { fileId: string; rowId: string };
	try {
		written = await uploadCloudSave(pair.to.token, pair.to.global, upload);
	} catch (err) {
		if (err instanceof CloudWriteError) return unverified(err);
		throw err;
	}
	logger.info(
		`migrate ${serverOf(pair.from)}→${toServer} ${upload.rowId ? "updated" : "created"} ${written.rowId} file ${written.fileId} (${zip.length} bytes)`,
	);
	let row: CloudRow;
	try {
		row = await verifyCloudSave(pair.to.token, pair.to.global, written, upload);
	} catch (err) {
		return unverified(err);
	}
	await host.db.del(STATE_KEY(userId)).catch(() => undefined);
	return {
		status: "done",
		to: side(pair.to, pair.toSave, row),
		toIsBound: (await getToken(host.rt, userId)) === pair.to.token,
	};
}

export async function clearMigrateQr(userId: string, slot: Slot) {
	const host = await getDataHost();
	await host.db.del(QR_KEY(userId, slot)).catch(() => undefined);
	await host.store.del(QR_LOCK(userId, slot)).catch(() => 0);
}

export async function resetMigrate(userId: string) {
	const host = await getDataHost();
	await clearMigrateQr(userId, "from");
	await clearMigrateQr(userId, "to");
	await host.db.del(STATE_KEY(userId)).catch(() => undefined);
}
