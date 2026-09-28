import { runInBackground } from "@/server/background";
import { logger, withDiscordUid } from "@/server/logger";
import type { Kv } from "@/server/sdk";
import { kvKey } from "./const";
import type { PhiRuntime } from "./runtime";
import type { Save, SavePayload } from "./save";
import { isTapApiFailure, tapCnProxyUrl } from "./tapapi";

const SAVE = (token: string) => kvKey("save", token);

const blobMem = new Map<string, { rev: string; raw: string }>();
const BLOB_MEM_MAX = 32;

function rememberBlob(token: string, rev: string, raw: string) {
	blobMem.delete(token);
	blobMem.set(token, { rev, raw });
	while (blobMem.size > BLOB_MEM_MAX) {
		const oldest = blobMem.keys().next().value;
		if (oldest === undefined) break;
		blobMem.delete(oldest);
	}
}

export function resetSaveBlobMemForTest() {
	blobMem.clear();
}

/** Which TapTap region answered last, so a refresh tries it first. Only a hint: bounded. */
const sessionRegion = new Map<string, boolean>();
const SESSION_REGION_MAX = 500;

function rememberRegion(userId: string, global: boolean) {
	sessionRegion.delete(userId);
	sessionRegion.set(userId, global);
	while (sessionRegion.size > SESSION_REGION_MAX) {
		const oldest = sessionRegion.keys().next().value;
		if (oldest === undefined) break;
		sessionRegion.delete(oldest);
	}
}

export function asSessionToken(raw: unknown): string | undefined {
	if (typeof raw !== "string" || !raw) return;
	const trimmed = raw.replace(/\s/g, "");
	if (/^[a-z0-9A-Z]{25}$/.test(trimmed)) return trimmed;
	if (!raw.startsWith("{") && !raw.startsWith('"')) return;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (typeof parsed === "string") return asSessionToken(parsed);
		if (parsed && typeof parsed === "object") {
			const o = parsed as Record<string, unknown>;
			return asSessionToken(o.d ?? o.sessionToken ?? o.token);
		}
	} catch {
		/* not json */
	}
}

export async function getToken(
	rt: PhiRuntime,
	userId: string,
): Promise<string | undefined> {
	return asSessionToken(await rt.store.getSessionToken(userId));
}

export const ALREADY_BOUND =
	"An account is already bound. Use `/phi account unbind` first, then bind again.";
export const NOT_BOUND =
	"No account is bound. Use `/phi account qrcode` (or `/phi account bind`) first.";

async function setToken(rt: PhiRuntime, userId: string, token: string) {
	await rt.store.setSessionToken(userId, token);
}

export async function clearUser(rt: PhiRuntime, db: Kv, userId: string) {
	sessionRegion.delete(userId);
	const token = await getToken(rt, userId);
	await rt.store.clearLocalCredentials(userId);
	if (!token) return false;
	runInBackground(reapOrphanSave(rt, db, token), (err) =>
		logger.warn(
			`orphan save cleanup skipped: ${err instanceof Error ? err.message : err}`,
		),
	);
	return true;
}

async function reapOrphanSave(rt: PhiRuntime, db: Kv, token: string) {
	const held = await rt.store.listSessionCredentials();
	for (const other of held.values()) if (other === token) return;
	await db.del(SAVE(token));
}

export async function loadSave(rt: PhiRuntime, db: Kv, userId: string) {
	const token = await getToken(rt, userId);
	if (!token) return undefined;
	return loadSaveByToken(rt, db, token);
}

/** For callers that already hold the token: saves the `phi:userToken` round trip. */
export async function loadSaveByToken(rt: PhiRuntime, db: Kv, token: string) {
	const raw = await db.get(SAVE(token));
	if (!raw) return undefined;
	return new rt.Save(JSON.parse(raw));
}

export function saveIdentity(
	saveInfo:
		| {
				gameFile?: { url?: string };
				modifiedAt?: { iso?: Date | string };
				summary?: { updatedAt?: string | Date };
		  }
		| undefined,
): string {
	const raw = String(saveInfo?.gameFile?.url || "");
	let file = raw;
	if (raw) {
		try {
			const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
			file = `${u.host}${u.pathname}`;
		} catch {
			file = raw.split("?")[0] || raw;
		}
	}
	const iso = saveInfo?.modifiedAt?.iso ?? saveInfo?.summary?.updatedAt;
	const ms =
		iso instanceof Date ? iso.getTime() : Date.parse(String(iso || ""));
	const stamp = Number.isFinite(ms) ? String(ms) : "";
	return file || stamp ? `${file}|${stamp}` : "";
}

function saveRev(
	saveInfo:
		| { gameFile?: { url?: string }; modifiedAt?: { iso?: Date | string } }
		| undefined,
): string | undefined {
	return saveIdentity(saveInfo) || undefined;
}

function saveZipHop(url: string | undefined): string {
	if (!url) return "";
	try {
		return tapCnProxyUrl(url) ? " via tap-proxy" : "";
	} catch {
		return "";
	}
}

async function fetchSaveInfo(rt: PhiRuntime, token: string, global: boolean) {
	const user = new rt.PhigrosUser(token, global);
	await user.getSaveInfo();
	return user;
}

export async function updateSave(
	rt: PhiRuntime,
	db: Kv,
	userId: string,
	opts: { token?: string; global?: boolean } = {},
) {
	return withDiscordUid(userId, () => updateSaveFor(rt, db, userId, opts));
}

async function updateSaveFor(
	rt: PhiRuntime,
	db: Kv,
	userId: string,
	opts: { token?: string; global?: boolean } = {},
) {
	const existing = await getToken(rt, userId);
	if (opts.token && existing) throw new Error(ALREADY_BOUND);
	const token = opts.token || existing;
	if (!token) throw new Error(NOT_BOUND);
	if (!/[a-z0-9A-Z]{25}/.test(token))
		throw new Error("SessionToken format is invalid (need 25 alphanumerics).");
	const bannedJob = rt.store.isSessionTokenBanned(token);
	bannedJob.catch(() => undefined);
	const preferred = opts.global ?? sessionRegion.get(userId) ?? false;
	let user: InstanceType<PhiRuntime["PhigrosUser"]>;
	try {
		user = await fetchSaveInfo(rt, token, preferred);
	} catch (err) {
		if (opts.global != null || isTapApiFailure(err)) throw err;
		user = await fetchSaveInfo(rt, token, !preferred);
	}
	rememberRegion(userId, user.global);
	if (await bannedJob) throw new Error("This sessionToken is banned.");
	const rev = saveRev(user.saveInfo);
	const hop = saveZipHop(user.saveInfo?.gameFile?.url);
	const hot = blobMem.get(token);
	const cachedRaw =
		hot && rev && hot.rev === rev ? hot.raw : await db.get(SAVE(token));
	const cached = cachedRaw ? JSON.parse(cachedRaw) : undefined;
	if (cached?.gameRecord && rev && rev === saveRev(cached.saveInfo)) {
		logger.info(
			`save cache hit ${rev}${hop}${hot?.rev === rev ? " (mem)" : ""}`,
		);
		if (cachedRaw) rememberBlob(token, rev, cachedRaw);
		await setToken(rt, userId, token);
		const save = new rt.Save(cached);
		if (opts.token) await snapshotB30(db, userId, save);
		return save;
	}
	logger.info(`save cache miss ${rev || "-"}${hop}`);
	await user.buildRecord();
	await setToken(rt, userId, token);
	const payload = JSON.stringify({
		session: user.session,
		global: user.global,
		saveInfo: user.saveInfo,
		playerInfo: user.playerInfo,
		gameRecord: user.gameRecord,
		gameProgress: user.gameProgress,
		gameuser: user.gameuser,
		gamesettings: user.gamesettings,
		Recordver: user.Recordver,
	});
	await db.set(SAVE(token), payload);
	if (rev) rememberBlob(token, rev, payload);
	const save = new rt.Save(user as unknown as SavePayload);
	await snapshotB30(db, userId, save);
	try {
		const { applySaveToHistory } = await import("./history");
		await applySaveToHistory(rt, db, token, save);
	} catch {}
	return save;
}

export async function snapshotB30(db: Kv, userId: string, save: Save) {
	const key = kvKey("hisb30", userId);
	let b19: Awaited<ReturnType<Save["getB19"]>>;
	try {
		b19 = await save.getB19(undefined, 33, { avgType: "none" });
	} catch {
		return;
	}
	const prev = JSON.parse((await db.get(key)) || "[]") as unknown[];
	const row = {
		t: Date.now(),
		rks: save.saveInfo?.summary?.rankingScore,
		phi: (b19.phi || []).flatMap((x) =>
			x ? [{ id: x.id, rank: x.rank }] : [],
		),
		b27: (b19.b19_list || [])
			.slice(0, 27)
			.map((x) => ({ id: x.id, rank: x.rank })),
	};
	const next = Array.isArray(prev) ? [...prev, row] : [row];
	while (next.length > 40) next.shift();
	await db.set(key, JSON.stringify(next));
}

export function moneyText(money: number[] | undefined) {
	const m = money || [0, 0, 0, 0, 0];
	return (
		`${m[4] ? `${m[4]}PiB ` : ""}${m[3] ? `${m[3]}TiB ` : ""}${m[2] ? `${m[2]}GiB ` : ""}${m[1] ? `${m[1]}MiB ` : ""}${m[0] ? `${m[0]}KiB ` : ""}`.trim() ||
		"0KiB"
	);
}
