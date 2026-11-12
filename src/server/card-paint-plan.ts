export const CARD_REQUEST_MS = 85_000;
export const DATA_TIMEOUT_MS = 75_000;
export const RENDER_TIMEOUT_MS = 45_000;
const PAINT_RESERVE_MS = 20_000;
const MIN_PAINT_MS = 5_000;

export function dataTimeoutMs(elapsedMs: number): number {
	return Math.min(
		DATA_TIMEOUT_MS,
		Math.max(1_000, CARD_REQUEST_MS - PAINT_RESERVE_MS - elapsedMs),
	);
}

export function paintTimeoutMs(elapsedMs: number): number | undefined {
	const left = CARD_REQUEST_MS - elapsedMs;
	if (left < MIN_PAINT_MS) return undefined;
	return Math.min(RENDER_TIMEOUT_MS, left);
}

export function heightInputs(
	partial: boolean,
	heightId: string,
	storedHeight: number | undefined,
): { heightKey?: string; height?: number } {
	if (partial) return {};
	return { heightKey: heightId, height: storedHeight };
}
