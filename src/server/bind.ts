import { kvKey } from "@/phi/lib/const";
import type { Save } from "@/phi/lib/save";
import { clearUser, getToken, updateSave } from "@/phi/lib/saves";
import { isTapApiFailure } from "@/phi/lib/tapapi";
import { isGlobalTapLogin } from "@/phi/lib/taptap";
import { lastSyncedIso } from "./bound";
import { getDataHost } from "./data-host";
import { logger, withDiscordUid } from "./logger";
import { clearManual } from "./manual";
import { ensureSongInfo } from "./song-info";

export type BindServer = "cn" | "gb";

const QR_KEY = (userId: string) => kvKey("webQr", userId);
const QR_LOCK = (userId: string) => kvKey("qrbind", userId);

type QrStored = {
	deviceId: string;
	data: {
		device_code?: string;
		expires_in?: number;
		qrcode_url?: string;
		interval?: number;
	};
	global: boolean;
};

export type BindOk = { playerId: string; rks?: number; lastSynced?: string };

export type BindErr = {
	error:
		| "already_bound"
		| "banned"
		| "invalid_token"
		| "qr_busy"
		| "qr_expired"
		| "qr_missing"
		| "bind_failed"
		| "unbind_failed"
		| "tapapi_unavailable"
		| "not_bound";
	status: number;
	detail?: string;
};

function asServer(raw: unknown, globalFlag?: unknown): BindServer {
	if (raw === "gb" || raw === "global" || globalFlag === true) return "gb";
	return "cn";
}

function failBind(err: unknown): BindErr {
	const msg = err instanceof Error ? err.message : String(err);
	logger.error("bind failed", err instanceof Error ? err : msg);
	if (isTapApiFailure(err)) {
		return { error: "tapapi_unavailable", status: 502 };
	}
	if (/banned/i.test(msg)) return { error: "banned", status: 403 };
	if (/already bound/i.test(msg))
		return { error: "already_bound", status: 409 };
	return { error: "bind_failed", status: 502, detail: msg || undefined };
}

function qrFields(request: {
	deviceId?: string;
	data?: {
		device_code?: string;
		expires_in?: number;
		qrcode_url?: string;
		interval?: number;
	};
	device_code?: string;
	expires_in?: number;
	qrcode_url?: string;
	interval?: number;
}) {
	const nested = request.data;
	const url = nested?.qrcode_url || request.qrcode_url;
	return {
		deviceId: request.deviceId,
		data: {
			device_code: nested?.device_code || request.device_code,
			expires_in: nested?.expires_in ?? request.expires_in,
			qrcode_url: url,
			interval: nested?.interval ?? request.interval,
		},
		url,
	};
}

function qrSucceeded(
	result: {
		success?: boolean;
		data?: { kid?: string; access_token?: string; error?: string };
	} | null,
) {
	if (!result) return false;
	if (result.success) return true;
	return Boolean(result.data?.kid && result.data?.access_token);
}

function playerFromSave(save: Save): BindOk {
	const rks = save.saveInfo.summary?.rankingScore;
	return {
		playerId: String(save.saveInfo.PlayerId || ""),
		rks: typeof rks === "number" ? rks : undefined,
		lastSynced: lastSyncedIso(save),
	};
}

export async function startQrBind(
	userId: string,
	server: unknown,
	globalFlag?: unknown,
): Promise<
	{ expiresIn: number; intervalMs: number; openUrl: string } | BindErr
> {
	return withDiscordUid(userId, () =>
		startQrBindFor(userId, server, globalFlag),
	);
}

async function startQrBindFor(
	userId: string,
	server: unknown,
	globalFlag?: unknown,
): Promise<
	{ expiresIn: number; intervalMs: number; openUrl: string } | BindErr
> {
	const host = await getDataHost();
	if (await getToken(host.rt, userId))
		return { error: "already_bound", status: 409 };
	if (await host.db.get(QR_KEY(userId))) await clearQr(userId);
	const locked = await host.store.set(QR_LOCK(userId), "1", {
		nx: true,
		ttlMs: 15 * 60 * 1000,
	});
	if (locked !== "OK") return { error: "qr_busy", status: 409 };

	const global = asServer(server, globalFlag) === "gb";
	try {
		const request = await host.rt.getQRcode.getRequest(global);
		const fields = qrFields(request);
		if (!fields.url || !fields.deviceId) {
			logger.error(`qr missing url ${JSON.stringify(request).slice(0, 400)}`);
			throw new Error("TapTap did not return a QR login URL.");
		}
		const expiresIn = Math.min(
			Math.max(Number(fields.data.expires_in) || 300, 30),
			840,
		);
		const intervalMs = Math.max(
			2000,
			(Number(fields.data.interval) || 2) * 1000,
		);
		const stored: QrStored = {
			deviceId: fields.deviceId,
			data: {
				device_code: fields.data.device_code,
				expires_in: fields.data.expires_in,
				qrcode_url: fields.url,
				interval: fields.data.interval,
			},
			global,
		};
		await host.db.set(QR_KEY(userId), JSON.stringify(stored), expiresIn * 1000);
		await host.store.set(QR_LOCK(userId), "1", { ttlMs: expiresIn * 1000 });
		return { expiresIn, intervalMs, openUrl: fields.url };
	} catch (err) {
		await clearQr(userId);
		return failBind(err);
	}
}

export async function qrPng(userId: string): Promise<Buffer | BindErr> {
	const host = await getDataHost();
	const raw = await host.db.get(QR_KEY(userId));
	if (!raw) return { error: "qr_missing", status: 404 };
	let stored: QrStored;
	try {
		stored = JSON.parse(raw) as QrStored;
	} catch {
		return { error: "qr_missing", status: 404 };
	}
	const url = stored.data.qrcode_url;
	if (!url) return { error: "qr_missing", status: 404 };
	return host.rt.getQRcode.getQRcode(url, stored.global);
}

export type QrResume = {
	resume: {
		result: {
			success?: boolean;
			data?: {
				kid?: string;
				access_token?: string;
				mac_key?: string;
				scope?: string;
				error?: string;
			};
		};
		useGlobal: boolean;
	};
};

export function isQrResume(
	value: { status: "waiting" | "scanned" } | BindOk | BindErr | QrResume,
): value is QrResume {
	return "resume" in value;
}

export async function peekQrBind(
	userId: string,
): Promise<{ status: "waiting" | "scanned" } | BindOk | BindErr | QrResume> {
	return withDiscordUid(userId, () => peekQrBindFor(userId));
}

/** The QR session is gone: either the bind finished elsewhere (another tab or instance) or it expired */
async function qrGone(
	host: Awaited<ReturnType<typeof getDataHost>>,
	userId: string,
	bound?: string,
): Promise<BindOk | BindErr> {
	await clearQr(userId);
	const token = bound ?? (await getToken(host.rt, userId));
	if (token) {
		const save = await host.lib.loadSaveByToken(host.rt, host.db, token);
		if (save) return playerFromSave(save);
		return { error: "already_bound", status: 409 };
	}
	return { error: "qr_expired", status: 410 };
}

/** TapTap answers that mean "not yet": the device code is still usable */
const QR_PENDING = new Set([
	"authorization_pending",
	"authorization_waiting",
	"slow_down",
]);

/** A bind done elsewhere leaves our QR session pending, so check the token now and then */
const QR_TOKEN_CHECK_MS = 10_000;
const qrTokenCheckedAt = new Map<string, number>();
const QR_TOKEN_CHECK_MAX = 500;

/** The first poll an instance sees only starts the clock: startQrBind just checked the token */
function qrTokenCheckDue(userId: string): boolean {
	const now = Date.now();
	const last = qrTokenCheckedAt.get(userId);
	if (last != null && now - last < QR_TOKEN_CHECK_MS) return false;
	qrTokenCheckedAt.delete(userId);
	qrTokenCheckedAt.set(userId, now);
	while (qrTokenCheckedAt.size > QR_TOKEN_CHECK_MAX) {
		const oldest = qrTokenCheckedAt.keys().next().value;
		if (oldest === undefined) break;
		qrTokenCheckedAt.delete(oldest);
	}
	return last != null;
}

export function resetQrPollForTest() {
	qrTokenCheckedAt.clear();
}

/** Polled while the QR shows: reads the QR session and asks TapTap; the token only when needed */
async function peekQrBindFor(
	userId: string,
): Promise<{ status: "waiting" | "scanned" } | BindOk | BindErr | QrResume> {
	const host = await getDataHost();
	const raw = await host.db.get(QR_KEY(userId));
	if (!raw) return qrGone(host, userId);
	let stored: QrStored;
	try {
		stored = JSON.parse(raw) as QrStored;
	} catch {
		return qrGone(host, userId);
	}

	const useGlobal = isGlobalTapLogin(stored, stored.global);
	const result = await host.rt.getQRcode.checkQRCodeResult(stored, useGlobal);
	if (qrSucceeded(result) && result) return { resume: { result, useGlobal } };
	const err = result?.data?.error;
	// A dead code (expired, denied, or used by another tab's bind) with no binding
	// yet keeps waiting: that bind may still be saving, else the session expires
	const dead = err != null && !QR_PENDING.has(err);
	if (dead || qrTokenCheckDue(userId)) {
		const token = await getToken(host.rt, userId);
		if (token) return qrGone(host, userId, token);
	}
	if (err === "authorization_waiting") return { status: "scanned" };
	return { status: "waiting" };
}

export async function finishQrBind(
	userId: string,
	resume: QrResume["resume"],
): Promise<BindOk | BindErr> {
	return withDiscordUid(userId, () => finishQrBindFor(userId, resume));
}

async function finishQrBindFor(
	userId: string,
	resume: QrResume["resume"],
): Promise<BindOk | BindErr> {
	const host = await getDataHost();
	// The catalog (needed to build the Save) loads during the TapTap login
	const songInfo = ensureSongInfo();
	songInfo.catch(() => undefined);
	let token: string;
	try {
		token = String(
			(await host.rt.getQRcode.getSessionToken(
				resume.result,
				resume.useGlobal,
			)) || "",
		).replace(/\s/g, "");
	} catch (err) {
		await clearQr(userId);
		return failBind(err);
	}
	if (!/[a-z0-9A-Z]{25}/.test(token)) {
		await clearQr(userId);
		return { error: "invalid_token", status: 400 };
	}
	try {
		await songInfo;
		const save = await updateSave(host.rt, host.db, userId, {
			token,
			global: resume.useGlobal,
		});
		await clearQr(userId);
		await leaveManualMode(userId);
		return playerFromSave(save);
	} catch (err) {
		await clearQr(userId);
		return failBind(err);
	}
}

/** A real bind replaces a manual profile; its hand-typed B30 snapshots go with it */
async function leaveManualMode(userId: string) {
	try {
		await clearManual(userId);
	} catch (err) {
		logger.warn(
			`manual cleanup skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
}

export async function bindWithToken(
	userId: string,
	rawToken: unknown,
	server: unknown,
	globalFlag?: unknown,
): Promise<BindOk | BindErr> {
	return withDiscordUid(userId, () =>
		bindWithTokenFor(userId, rawToken, server, globalFlag),
	);
}

async function bindWithTokenFor(
	userId: string,
	rawToken: unknown,
	server: unknown,
	globalFlag?: unknown,
): Promise<BindOk | BindErr> {
	const host = await getDataHost();
	const songInfo = ensureSongInfo();
	songInfo.catch(() => undefined);
	if (await getToken(host.rt, userId))
		return { error: "already_bound", status: 409 };
	const token = String(rawToken || "").replace(/\s/g, "");
	if (!/[a-z0-9A-Z]{25}/.test(token))
		return { error: "invalid_token", status: 400 };
	try {
		await songInfo;
		const save = await updateSave(host.rt, host.db, userId, {
			token,
			global: asServer(server, globalFlag) === "gb",
		});
		await clearQr(userId);
		await leaveManualMode(userId);
		return playerFromSave(save);
	} catch (err) {
		return failBind(err);
	}
}

export async function cancelQrBind(userId: string): Promise<{ ok: true }> {
	await clearQr(userId);
	return { ok: true };
}

export async function unbindAccount(
	userId: string,
): Promise<{ ok: true } | BindErr> {
	return withDiscordUid(userId, () => unbindAccountFor(userId));
}

async function unbindAccountFor(
	userId: string,
): Promise<{ ok: true } | BindErr> {
	const host = await getDataHost();
	try {
		const had = await clearUser(host.rt, userId);
		await clearQr(userId);
		if (!had && !(await clearManual(userId)))
			return { error: "not_bound", status: 409 };
		return { ok: true };
	} catch (err) {
		logger.error("unbind failed", err);
		return { error: "unbind_failed", status: 502 };
	}
}

async function clearQr(userId: string) {
	const host = await getDataHost();
	await host.db.del(QR_KEY(userId)).catch(() => undefined);
	await host.store.del(QR_LOCK(userId)).catch(() => 0);
}
