export const REFRESH_COOLDOWN_MS = 120_000;

export const REFRESH_UNTIL_KEY = "phi.web.refreshUntil";
export const CARD_RELOAD_KEY = "phi.web.cardReload";
export const CARD_REVISION_KEY = "phi.web.cardRevision";
export const SAVE_REFRESHED_EVENT = "phi-save-refreshed";

type Listener = () => void;
const listeners = new Set<Listener>();

let hydrated = false;
let reloadToken = "";
let refreshUntil = 0;

function hydrateFromSession() {
	if (hydrated || typeof window === "undefined") return;
	hydrated = true;
	try {
		reloadToken = sessionStorage.getItem(CARD_RELOAD_KEY) || reloadToken;
		const n = Number(sessionStorage.getItem(REFRESH_UNTIL_KEY) || 0);
		if (Number.isFinite(n) && n > refreshUntil) refreshUntil = n;
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

export function persistCooldown() {
	hydrateFromSession();
	refreshUntil = Date.now() + REFRESH_COOLDOWN_MS;
	writeSession(REFRESH_UNTIL_KEY, String(refreshUntil));
	emit();
}

export function persistCardReload(lastSynced?: string) {
	hydrateFromSession();
	reloadToken = String(Date.now());
	writeSession(CARD_RELOAD_KEY, reloadToken);
	writeSession(
		CARD_REVISION_KEY,
		lastSynced ? `${lastSynced}:${reloadToken}` : reloadToken,
	);
	persistCooldown();
}

export function bumpCardReload() {
	hydrateFromSession();
	reloadToken = String(Date.now());
	writeSession(CARD_RELOAD_KEY, reloadToken);
	emit();
}

export function withCardReload(src: string, token: string): string {
	return cardFetchUrl(src, { _: token || undefined });
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
