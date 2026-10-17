import { readLocal } from "./local-store";

/** A token added to every R2 link's `v` so cached files are fetched again; a cookie, so the server adds it too */
export const REFRESH_COOKIE = "phi-asset-refresh";
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

/** The token for the time the button was pressed, while that is under 30 days ago */
export function refreshToken(
	stamp: string | null | undefined,
	now = Date.now(),
): string | undefined {
	const at = Number(stamp);
	if (!stamp || !Number.isFinite(at) || at <= 0 || now - at > KEEP_MS) {
		return undefined;
	}
	return at.toString(36);
}

function cookieStamp(): string | undefined {
	const prefix = `${REFRESH_COOKIE}=`;
	return document.cookie
		.split("; ")
		.find((part) => part.startsWith(prefix))
		?.slice(prefix.length);
}

function writeStamp(at: number, now = Date.now()) {
	const age = Math.round((KEEP_MS - (now - at)) / 1000);
	// biome-ignore lint/suspicious/noDocumentCookie: not httpOnly; Cookie Store is not universal
	document.cookie = `${REFRESH_COOKIE}=${at}; Path=/; Max-Age=${age}; SameSite=Lax`;
}

export function readRefreshToken(now = Date.now()): string | undefined {
	try {
		return refreshToken(cookieStamp(), now);
	} catch {
		return undefined;
	}
}

export function markRefresh(now = Date.now()): void {
	writeStamp(now, now);
}

/** A press from before the token moved to a cookie: copy it over once */
export function adoptStoredRefresh(now = Date.now()): void {
	const stored = readLocal(REFRESH_COOKIE);
	if (!stored || !refreshToken(stored, now)) return;
	try {
		if (!cookieStamp()) writeStamp(Number(stored), now);
		window.localStorage.removeItem(REFRESH_COOKIE);
	} catch {}
}

/** `v` with the token on it; an unversioned link gets `v=0-<token>` */
export function refreshedVersion(
	version: string | undefined,
	token: string | undefined,
): string | undefined {
	if (!token) return version;
	return `${version || "0"}-${token}`;
}
