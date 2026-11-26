export const CROSS_TIER_MIN_ACC = 70;
export const CROSS_TIER_MAX_ACC = 99.8;
const BEST_SLOTS = 27;
const LEVEL_ORDER = ["EZ", "HD", "IN", "AT"];

export type CrossTierRecord = {
	id: string;
	rank: string;
	acc: number;
	difficulty: number;
};

export type CrossTierPick<T extends CrossTierRecord> = {
	record: T;
	gap: number;
};

function levelIndex(rank: string) {
	const i = LEVEL_ORDER.indexOf(rank);
	return i < 0 ? LEVEL_ORDER.length : i;
}

export function crossTier<T extends CrossTierRecord>(
	ranked: readonly T[],
	line: number,
): CrossTierPick<T>[] {
	return ranked
		.slice(BEST_SLOTS)
		.filter(
			(r) =>
				r.difficulty - line > 1e-9 &&
				r.acc >= CROSS_TIER_MIN_ACC &&
				r.acc <= CROSS_TIER_MAX_ACC,
		)
		.sort(
			(a, b) =>
				b.difficulty - a.difficulty ||
				a.acc - b.acc ||
				(a.id < b.id ? -1 : a.id > b.id ? 1 : 0) ||
				levelIndex(a.rank) - levelIndex(b.rank),
		)
		.map((record) => ({ record, gap: record.difficulty - line }));
}

export function crossGapText(gap: number): string {
	return `+${Math.max(gap, 0.01).toFixed(2)}`;
}
