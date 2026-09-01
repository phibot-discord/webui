import { kvKey } from "@/phi/lib/const";
import type { Save } from "@/phi/lib/save";
import { clearUser, getToken, updateSave } from "@/phi/lib/saves";
import { lastSyncedIso } from "./bound";
import { getDataHost } from "./data-host";
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
		| "not_bound";
	status: number;
	detail?: string;
};

function asServer(raw: unknown): BindServer {
	return raw === "gb" ? "gb" : "cn";
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

	const global = asServer(server) === "gb";
	try {
		const request = await host.rt.getQRcode.getRequest(global);
		const fields = qrFields(request);
		if (!fields.url || !fields.deviceId)
			throw new Error("TapTap did not return a QR login URL.");
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
		return {
			error: "bind_failed",
			status: 502,
			detail: err instanceof Error ? err.message : undefined,
		};
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

export async function pollQrBind(
	userId: string,
): Promise<{ status: "waiting" | "scanned" } | BindOk | BindErr> {
	const host = await getDataHost();
	if (await getToken(host.rt, userId)) {
		await clearQr(userId);
		const save = await host.lib.loadSave(host.rt, host.db, userId);
		if (save) return playerFromSave(save);
		return { error: "already_bound", status: 409 };
	}
	const raw = await host.db.get(QR_KEY(userId));
	if (!raw) {
		await clearQr(userId);
		return { error: "qr_expired", status: 410 };
	}
	let stored: QrStored;
	try {
		stored = JSON.parse(raw) as QrStored;
	} catch {
		await clearQr(userId);
		return { error: "qr_expired", status: 410 };
	}

	const result = await host.rt.getQRcode.checkQRCodeResult(
		stored,
		stored.global,
	);
	if (!qrSucceeded(result)) {
		const err = result?.data?.error;
		if (err === "authorization_waiting") return { status: "scanned" };
		return { status: "waiting" };
	}

	let token: string;
	try {
		token = String(
			(await host.rt.getQRcode.getSessionToken(result, stored.global)) || "",
		).replace(/\s/g, "");
	} catch (err) {
		await clearQr(userId);
		return {
			error: "bind_failed",
			status: 502,
			detail: err instanceof Error ? err.message : undefined,
		};
	}
	if (!/[a-z0-9A-Z]{25}/.test(token)) {
		await clearQr(userId);
		return { error: "invalid_token", status: 400 };
	}
	try {
		await ensureSongInfo();
		const save = await updateSave(host.rt, host.db, userId, {
			token,
			global: stored.global,
		});
		await clearQr(userId);
		return playerFromSave(save);
	} catch (err) {
		await clearQr(userId);
		const msg = err instanceof Error ? err.message : "";
		if (/banned/i.test(msg)) return { error: "banned", status: 403 };
		if (/already bound/i.test(msg))
			return { error: "already_bound", status: 409 };
		return { error: "bind_failed", status: 502, detail: msg || undefined };
	}
}

export async function bindWithToken(
	userId: string,
	rawToken: unknown,
	server: unknown,
): Promise<BindOk | BindErr> {
	const host = await getDataHost();
	if (await getToken(host.rt, userId))
		return { error: "already_bound", status: 409 };
	const token = String(rawToken || "").replace(/\s/g, "");
	if (!/[a-z0-9A-Z]{25}/.test(token))
		return { error: "invalid_token", status: 400 };
	try {
		await ensureSongInfo();
		const save = await updateSave(host.rt, host.db, userId, {
			token,
			global: asServer(server) === "gb",
		});
		await clearQr(userId);
		return playerFromSave(save);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "";
		if (/banned/i.test(msg)) return { error: "banned", status: 403 };
		if (/already bound/i.test(msg))
			return { error: "already_bound", status: 409 };
		return { error: "bind_failed", status: 502, detail: msg || undefined };
	}
}

export async function cancelQrBind(userId: string): Promise<{ ok: true }> {
	await clearQr(userId);
	return { ok: true };
}

export async function unbindAccount(
	userId: string,
): Promise<{ ok: true } | BindErr> {
	const host = await getDataHost();
	try {
		const had = await clearUser(host.rt, host.db, userId);
		await clearQr(userId);
		if (!had) return { error: "not_bound", status: 409 };
		return { ok: true };
	} catch {
		return { error: "unbind_failed", status: 502 };
	}
}

async function clearQr(userId: string) {
	const host = await getDataHost();
	await host.db.del(QR_KEY(userId)).catch(() => undefined);
	await host.store.del(QR_LOCK(userId)).catch(() => 0);
}
