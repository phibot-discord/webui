import { readLocal, writeLocal } from "./local-store";
import { REVIEW_YEAR } from "./review-window";

const SEEN_KEY = "phi-recap-seen";
const READY_KEY = "phi-recap-ready";
const YEAR = String(REVIEW_YEAR);

export function recapSeen(): boolean {
	return readLocal(SEEN_KEY) === YEAR;
}

export function markRecapSeen(): void {
	writeLocal(SEEN_KEY, YEAR);
}

export function cachedReady(day: string): boolean | undefined {
	const cached = readLocal(READY_KEY);
	if (!cached?.startsWith(`${YEAR}:${day}:`)) return undefined;
	return cached.endsWith(":1");
}

export function cacheReady(day: string, ready: boolean): void {
	writeLocal(READY_KEY, `${YEAR}:${day}:${ready ? 1 : 0}`);
}

export function forgetRecapNote(): void {
	try {
		window.localStorage.removeItem(SEEN_KEY);
		window.localStorage.removeItem(READY_KEY);
	} catch {}
}
