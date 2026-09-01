export const REFRESH_COOLDOWN_MS = 120_000;

export const REFRESH_UNTIL_KEY = "phi.web.refreshUntil";
export const CARD_RELOAD_KEY = "phi.web.cardReload";
export const SAVE_REFRESHED_EVENT = "phi-save-refreshed";

export function withCardReload(src: string, token: string): string {
	if (!token) return src;
	const join = src.includes("?") ? "&" : "?";
	return `${src}${join}_=${encodeURIComponent(token)}`;
}
