import { clearCardBlobs } from "./card-fetch";

export const REFRESH_UNTIL_KEY = "phi.web.refreshUntil";
export const BYPASS_UNTIL_KEY = "phi.web.bypassUntil";
export const BUST_EPOCH_KEY = "phi.web.cardEpoch";
export const SAVE_REFRESHED_EVENT = "phi-save-refreshed";

type Listener = () => void;
const listeners = new Set<Listener>();

let hydrated = false;
let reloadToken = "";
let refreshUntil = 0;
let bypassUntil = 0;
let bustEpoch = "";

function readUntil(key: string) {
	const n = Number(sessionStorage.getItem(key) || 0);
	return Number.isFinite(n) ? n : 0;
}

function hydrateFromSession() {
	if (hydrated || typeof window === "undefined") return;
	hydrated = true;
	try {
		refreshUntil = Math.max(refreshUntil, readUntil(REFRESH_UNTIL_KEY));
		bypassUntil = Math.max(bypassUntil, readUntil(BYPASS_UNTIL_KEY));
		if (!bustEpoch) bustEpoch = sessionStorage.getItem(BUST_EPOCH_KEY) || "";
	} catch {
		/* private mode */
	}
}

function emit() {
	for (const fn of listeners) fn();
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(SAVE_REFRESHED_EVENT));
	}
}

function writeSession(key: string, value: string) {
	try {
		sessionStorage.setItem(key, value);
	} catch {
		/* private mode */
	}
}

export function subscribeSaveRefresh(onStoreChange: Listener) {
	listeners.add(onStoreChange);
	return () => {
		listeners.delete(onStoreChange);
	};
}

export function getReloadToken(): string {
	hydrateFromSession();
	return reloadToken;
}

export function getRefreshUntil(): number {
	hydrateFromSession();
	return refreshUntil;
}

export function cooldownMsFromServer(
	data: unknown,
	headers?: Headers | null,
): number {
	const obj =
		data && typeof data === "object" ? (data as Record<string, unknown>) : {};
	if (
		typeof obj.cooldownMs === "number" &&
		Number.isFinite(obj.cooldownMs) &&
		obj.cooldownMs > 0
	) {
		return Math.round(obj.cooldownMs);
	}
	const raw = obj.retryAfter ?? headers?.get("retry-after");
	const sec = typeof raw === "number" ? raw : Number(raw);
	if (Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000);
	return 0;
}

function persistUntil(
	key: string,
	setUntil: (n: number) => void,
	remainMs: number,
) {
	hydrateFromSession();
	if (!(remainMs > 0)) return;
	const until = Date.now() + remainMs;
	setUntil(until);
	writeSession(key, String(until));
	emit();
}

export function persistCooldown(remainMs: number) {
	persistUntil(
		REFRESH_UNTIL_KEY,
		(n) => {
			refreshUntil = n;
		},
		remainMs,
	);
}

export function getBypassUntil(): number {
	hydrateFromSession();
	return bypassUntil;
}

export function persistBypassCooldown(remainMs: number) {
	persistUntil(
		BYPASS_UNTIL_KEY,
		(n) => {
			bypassUntil = n;
		},
		remainMs,
	);
}

export function persistBustEpoch(epoch: string) {
	hydrateFromSession();
	if (!/^\d{10,16}$/.test(epoch)) return;
	bustEpoch = epoch;
	writeSession(BUST_EPOCH_KEY, epoch);
}

export function getBustEpoch(): string {
	hydrateFromSession();
	return bustEpoch;
}

export function persistCardReload(_lastSynced?: string) {
	hydrateFromSession();
	reloadToken = String(Date.now());
	clearCardBlobs();
	emit();
}

export function bumpCardReload() {
	hydrateFromSession();
	reloadToken = String(Date.now());
	clearCardBlobs();
	emit();
}

export function cardFetchUrl(
	src: string,
	extra: Record<string, string | undefined>,
): string {
	const u = new URL(src, "http://local.invalid");
	for (const [key, value] of Object.entries(extra)) {
		if (value) u.searchParams.set(key, value);
	}
	return `${u.pathname}${u.search}`;
}
