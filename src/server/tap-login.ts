import { randomBytes } from "node:crypto";
import { kvKey } from "@/phi/lib/const";
import type { TapLogin } from "@/phi/lib/taptap";
import { tapSignInUser } from "./account-link";
import { sealTapTicket } from "./auth-tickets";
import { signInAvatar } from "./avatar";
import {
	asServer,
	type BindErr,
	type BindOk,
	clearQrAt,
	failBind,
	peekQrAt,
	type QrResume,
	type QrWait,
	qrPngAt,
	requestQr,
	switchBind,
} from "./bind";
import { playerFromSave } from "./bound";
import { getDataHost } from "./data-host";
import { withDiscordUid } from "./logger";
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

export function tapLoginQrPng(loginId: string): Promise<Buffer | BindErr> {
	return qrPngAt(LOGIN_KEY(loginId));
}

export function peekTapLogin(
	loginId: string,
): Promise<QrWait | BindErr | QrResume> {
	return peekQrAt(LOGIN_KEY(loginId), LOGIN_LOCK(loginId));
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
			// Read while the save binds; signInAvatar never rejects
			const image = signInAvatar(userId, login.avatar);
			try {
				await songInfo;
				const save = await switchBind(host, userId, token, resume.useGlobal);
				const player = playerFromSave(save);
				const ticket = await sealTapTicket(loginId, {
					id: userId,
					name: login.name || player.playerId || undefined,
					image: await image,
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

export function clearTapLogin(loginId: string) {
	return clearQrAt(LOGIN_KEY(loginId), LOGIN_LOCK(loginId));
}
