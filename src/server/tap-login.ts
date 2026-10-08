import { randomBytes } from "node:crypto";
import { kvKey } from "@/phi/lib/const";
import { clearUser, getToken, updateSave } from "@/phi/lib/saves";
import type { TapLogin } from "@/phi/lib/taptap";
import { isGlobalTapLogin } from "@/phi/lib/taptap";
import { tapSignInUser } from "./account-link";
import { sealTapTicket } from "./auth-tickets";
import {
	asServer,
	type BindErr,
	type BindOk,
	failBind,
	parseQrStored,
	playerFromSave,
	QR_PENDING,
	type QrResume,
	qrSucceeded,
	requestQr,
} from "./bind";
import { type DataHost, getDataHost } from "./data-host";
import { withDiscordUid } from "./logger";
import { leaveManualMode } from "./manual";
import { ensureSongInfo } from "./song-info";

/** Keyed by a random id that only the visitor's httpOnly cookie holds */
const LOGIN_KEY = (loginId: string) => kvKey("webTapLogin", loginId);
/** Held while one poll turns the scan into a token and a bound save */
const LOGIN_LOCK = (loginId: string) => kvKey("webTapLoginLock", loginId);
const LOGIN_LOCK_MS = 3 * 60_000;

export function newLoginId(): string {
	return randomBytes(24).toString("base64url");
}

export async function startTapLogin(
	loginId: string,
	server: unknown,
	globalFlag?: unknown,
): Promise<
	{ expiresIn: number; intervalMs: number; openUrl: string } | BindErr
> {
	const host = await getDataHost();
	try {
		const global = asServer(server, globalFlag) === "gb";
		const { stored, ...shown } = await requestQr(host.rt, global);
		await host.db.set(
			LOGIN_KEY(loginId),
			JSON.stringify(stored),
			shown.expiresIn * 1000,
		);
		return shown;
	} catch (err) {
		return failBind(err);
	}
}

export async function tapLoginQrPng(
	loginId: string,
): Promise<Buffer | BindErr> {
	const host = await getDataHost();
	const stored = parseQrStored(await host.db.get(LOGIN_KEY(loginId)));
	const url = stored?.data.qrcode_url;
	if (!stored || !url) return { error: "qr_missing", status: 404 };
	return host.rt.getQRcode.getQRcode(url, stored.global);
}

export async function peekTapLogin(
	loginId: string,
): Promise<{ status: "waiting" | "scanned" } | BindErr | QrResume> {
	const host = await getDataHost();
	const stored = parseQrStored(await host.db.get(LOGIN_KEY(loginId)));
	if (!stored) return { error: "qr_expired", status: 410 };
	const useGlobal = isGlobalTapLogin(stored, stored.global);
	const result = await host.rt.getQRcode.checkQRCodeResult(stored, useGlobal);
	if (qrSucceeded(result) && result) return { resume: { result, useGlobal } };
	const err = result?.data?.error;
	if (err === "authorization_waiting") return { status: "scanned" };
	// Denied or expired. While a finish holds the lock the code was just used: keep waiting
	if (err != null && !QR_PENDING.has(err)) {
		if (await host.store.get(LOGIN_LOCK(loginId))) return { status: "scanned" };
		await clearTapLogin(loginId);
		return { error: "qr_expired", status: 410 };
	}
	return { status: "waiting" };
}

async function bindSignIn(
	host: DataHost,
	userId: string,
	token: string,
	global: boolean,
) {
	const existing = await getToken(host.rt, userId);
	if (existing === token)
		return updateSave(host.rt, host.db, userId, { bound: token, global });
	if (existing) await clearUser(host.rt, userId);
	const save = await updateSave(host.rt, host.db, userId, { token, global });
	await leaveManualMode(userId);
	return save;
}

export async function finishTapLogin(
	loginId: string,
	resume: QrResume["resume"],
): Promise<(BindOk & { ticket: string }) | BindErr> {
	const host = await getDataHost();
	const locked = await host.store.set(LOGIN_LOCK(loginId), "1", {
		nx: true,
		ttlMs: LOGIN_LOCK_MS,
	});
	if (locked !== "OK") return { error: "qr_busy", status: 409 };
	// The catalog (needed to build the Save) loads during the TapTap login
	const songInfo = ensureSongInfo();
	songInfo.catch(() => undefined);
	try {
		let login: TapLogin;
		try {
			login = await host.rt.getQRcode.login(resume.result, resume.useGlobal);
		} catch (err) {
			return failBind(err);
		}
		const token = String(login.sessionToken || "").replace(/\s/g, "");
		if (!/[a-z0-9A-Z]{25}/.test(token))
			return { error: "invalid_token", status: 400 };
		const objectId = login.objectId;
		if (!objectId)
			return failBind(new Error("TapTap sign-in returned no Phigros account."));
		const userId = await tapSignInUser(objectId, token);
		return await withDiscordUid(userId, async () => {
			try {
				await songInfo;
				const save = await bindSignIn(host, userId, token, resume.useGlobal);
				const player = playerFromSave(save);
				const ticket = await sealTapTicket(loginId, {
					id: userId,
					name: login.name || player.playerId || undefined,
					image: login.avatar,
				});
				return { ticket, ...player };
			} catch (err) {
				return failBind(err);
			}
		});
	} finally {
		await clearTapLogin(loginId);
	}
}

export async function clearTapLogin(loginId: string) {
	const host = await getDataHost();
	await host.db.del(LOGIN_KEY(loginId)).catch(() => undefined);
	await host.store.del(LOGIN_LOCK(loginId)).catch(() => 0);
}
