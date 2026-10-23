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
import { isTapApiFailure, isTapRateLimited } from "@/phi/lib/tapapi";
import {
	asServer,
	type BindServer,
	clearQrAt,
	peekQrAt,
	type QrResume,
	type QrWait,
	qrPngAt,
	requestQr,
} from "./bind";
import { type DataHost, getDataHost } from "./data-host";
import { logger, withDiscordUid } from "./logger";

export type Slot = "from" | "to";
export type Server = BindServer;

export function asSlot(raw: unknown): Slot | undefined {
	return raw === "from" || raw === "to" ? raw : undefined;
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
		| "tapapi_rate_limited"
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

function logDetail(what: string, err: unknown): string | undefined {
	const msg = err instanceof Error ? err.message : String(err);
	logger.error(what, err instanceof Error ? err : msg);
	return msg || undefined;
}

function failMigrate(err: unknown): MigrateErr {
	const detail = logDetail("migrate failed", err);
	if (isTapRateLimited(err))
		return { error: "tapapi_rate_limited", status: 502 };
	if (isTapApiFailure(err)) return { error: "tapapi_unavailable", status: 502 };
	return { error: "migrate_failed", status: 502, detail };
}

function unverified(err: unknown): MigrateErr {
	const detail = logDetail("migrate unverified", err);
	return { error: "migrate_unverified", status: 502, detail };
}

function rowRev(row: CloudRow | undefined): string {
	if (!row) return NO_ROW;
	return `${row.objectId}:${row.gameFile?.objectId ?? ""}:${row.modifiedAt?.iso ?? row.updatedAt ?? ""}`;
}

function serverOf(account: Account): Server {
	return account.global ? "gb" : "cn";
}

function summaryOf(raw: string): Summary | undefined {
	try {
		return new Summary(raw);
	} catch {
		return undefined;
	}
}

type Read = { account: Account; save: CloudSave; row?: CloudRow };
type SourceRead = Read & { row: CloudRow };
type Pair = { from: SourceRead; to: Read };

function hasSource(read: Read): read is SourceRead {
	return Boolean(read.row?.gameFile?.url);
}

function side({ account, save, row }: Read): SaveSide {
	const base: SaveSide = {
		server: serverOf(account),
		player: save.nickname || "",
		hasSave: Boolean(row),
	};
	if (!row) return base;
	const summary = summaryOf(row.summary);
	const rks = summary?.rankingScore;
	return {
		...base,
		rks: typeof rks === "number" && Number.isFinite(rks) ? rks : undefined,
		challengeModeRank: summary?.challengeModeRank,
		gameVersion: summary?.gameVersion,
		modifiedAt: row.modifiedAt?.iso ?? row.updatedAt,
	};
}

async function readAccount(account: Account): Promise<Read | MigrateErr> {
	try {
		const save = await readCloudSave(account.token, account.global);
		return { account, save, row: latestRow(save.rows) };
	} catch (err) {
		if (err instanceof CloudSessionError)
			return { error: "migrate_rejected", status: 400 };
		return failMigrate(err);
	}
}

async function readPair(
	from: Account,
	to: Account,
): Promise<Pair | MigrateErr> {
	const [a, b] = await Promise.all([readAccount(from), readAccount(to)]);
	if ("error" in a) return a;
	if ("error" in b) return b;
	if (!hasSource(a)) return { error: "migrate_no_source_save", status: 409 };
	if (from.global === to.global && a.save.userId === b.save.userId)
		return { error: "migrate_same_account", status: 409 };
	return { from: a, to: b };
}

function revsOf(pair: Pair) {
	return { from: rowRev(pair.from.row), to: rowRev(pair.to.row) };
}

function preview(pair: Pair, bound: string | undefined): MigratePreview {
	const from = side(pair.from);
	const to = side(pair.to);
	return {
		from,
		to,
		newer: to.hasSave && (from.gameVersion ?? 0) > (to.gameVersion ?? 0),
		toIsBound: bound === pair.to.account.token,
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

export type SlotReady = {
	status: "ready";
	side: SaveSide;
	preview?: MigratePreview;
};

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
		if (!hasSource(read))
			return { error: "migrate_no_source_save", status: 409 };
		await writeState(host, userId, { from: account });
		return { status: "ready", side: side(read) };
	}
	const state = await readState(host, userId);
	if (!state.from) return { error: "migrate_expired", status: 410 };
	const pair = await readPair(state.from, account);
	if ("error" in pair) return pair;
	const [bound] = await Promise.all([
		getToken(host.rt, userId),
		writeState(host, userId, {
			from: state.from,
			to: account,
			revs: revsOf(pair),
		}),
	]);
	const view = preview(pair, bound);
	return { status: "ready", side: view.to, preview: view };
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
		const connect = (global: boolean) =>
			connectSlot(host, userId, "from", { token, global });
		try {
			if (region != null) return await connect(region);
			const cn = await connect(false);
			return "error" in cn && cn.error === "migrate_rejected"
				? await connect(true)
				: cn;
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
		try {
			const [{ stored, ...shown }] = await Promise.all([
				requestQr(host.rt, asServer(server) === "gb"),
				clearMigrateQr(userId, slot),
			]);
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

export function peekMigrateQr(
	userId: string,
	slot: Slot,
): Promise<QrWait | MigrateErr | QrResume> {
	return peekQrAt(QR_KEY(userId, slot), QR_LOCK(userId, slot));
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
			let token: string | undefined;
			try {
				token = asSessionToken(
					String(
						(await host.rt.getQRcode.getSessionToken(
							resume.result,
							resume.useGlobal,
						)) || "",
					),
				);
			} catch (err) {
				return failMigrate(err);
			}
			if (!token) return { error: "invalid_token", status: 400 };
			return await connectSlot(host, userId, slot, {
				token,
				global: resume.useGlobal,
			}).catch(failMigrate);
		} finally {
			await clearMigrateQr(userId, slot);
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
		const token = asSessionToken(rawToken);
		if (!token) return { error: "invalid_token", status: 400 };
		const host = await getDataHost();
		try {
			const [, ready] = await Promise.all([
				host.db.del(QR_KEY(userId, slot)).catch(() => undefined),
				connectSlot(host, userId, slot, {
					token,
					global: asServer(server) === "gb",
				}),
			]);
			return ready;
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
	const { from, to } = pair;
	const revs = revsOf(pair);
	if (revs.from !== state.revs.from || revs.to !== state.revs.to) {
		const [bound] = await Promise.all([
			getToken(host.rt, userId),
			writeState(host, userId, { ...state, revs }),
		]);
		return {
			error: "migrate_changed",
			status: 409,
			preview: preview(pair, bound),
		};
	}
	const zip = await downloadSaveZip(from.row.gameFile?.url ?? "");
	const toServer = serverOf(to.account);
	await host.store.set(
		UNDO_KEY(userId, toServer, to.save.userId),
		JSON.stringify({
			at: new Date().toISOString(),
			server: toServer,
			user: to.save.userId,
			row: to.row?.objectId ?? null,
			gameFile: to.row?.gameFile?.objectId,
			url: to.row?.gameFile?.url,
			summary: to.row?.summary,
			modifiedAt: to.row?.modifiedAt?.iso,
		}),
		{ nx: true, ttlMs: UNDO_TTL_MS },
	);
	const upload: SaveUpload = {
		userId: to.save.userId,
		rowId: to.row?.objectId,
		name: from.row.name,
		zip,
		summary: from.row.summary,
	};
	const { token, global } = to.account;
	let written: { fileId: string; rowId: string };
	try {
		written = await uploadCloudSave(token, global, upload);
	} catch (err) {
		if (err instanceof CloudWriteError) return unverified(err);
		throw err;
	}
	logger.info(
		`migrate ${serverOf(from.account)}→${toServer} ${upload.rowId ? "updated" : "created"} ${written.rowId} file ${written.fileId} (${zip.length} bytes)`,
	);
	let row: CloudRow;
	try {
		row = await verifyCloudSave(token, global, written, upload);
	} catch (err) {
		return unverified(err);
	}
	const [bound] = await Promise.all([
		getToken(host.rt, userId),
		host.db.del(STATE_KEY(userId)).catch(() => undefined),
	]);
	return {
		status: "done",
		to: side({ ...to, row }),
		toIsBound: bound === token,
	};
}

export function clearMigrateQr(userId: string, slot: Slot) {
	return clearQrAt(QR_KEY(userId, slot), QR_LOCK(userId, slot));
}

export async function resetMigrate(userId: string) {
	const host = await getDataHost();
	await Promise.all([
		clearMigrateQr(userId, "from"),
		clearMigrateQr(userId, "to"),
		host.db.del(STATE_KEY(userId)).catch(() => undefined),
	]);
}
