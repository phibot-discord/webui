export const DIFF_TIERS = ["great", "good", "even", "hard", "wall"] as const;
export type DiffTier = (typeof DIFF_TIERS)[number];

export type DiffChart = {
	id: string;
	song: string;
	rank: string;
	c: number;
	acc: number;
	diff: number;
};

export type DiffLevel = {
	level: number;
	count: number;
	tiers: Record<DiffTier, DiffChart[]>;
};

const FAR = 1;
const NEAR = 0.35;

export function tierOf(z: number): DiffTier {
	if (z >= FAR) return "great";
	if (z >= NEAR) return "good";
	if (z > -NEAR) return "even";
	if (z > -FAR) return "hard";
	return "wall";
}

export function difficultyTable(charts: readonly DiffChart[]): DiffLevel[] {
	const usable = charts.filter(
		(c) => Number.isFinite(c.diff) && Number.isFinite(c.c) && c.c > 0,
	);
	if (!usable.length) return [];
	const mean = usable.reduce((sum, c) => sum + c.diff, 0) / usable.length;
	const spread = Math.sqrt(
		usable.reduce((sum, c) => sum + (c.diff - mean) ** 2, 0) / usable.length,
	);
	const levels = new Map<number, DiffLevel>();
	for (const chart of usable) {
		const level = Math.floor(chart.c);
		let entry = levels.get(level);
		if (!entry) {
			entry = {
				level,
				count: 0,
				tiers: { great: [], good: [], even: [], hard: [], wall: [] },
			};
			levels.set(level, entry);
		}
		entry.count++;
		entry.tiers[
			spread > 0 ? tierOf((chart.diff - mean) / spread) : "even"
		].push(chart);
	}
	const order = (a: DiffChart, b: DiffChart) =>
		b.diff - a.diff ||
		b.c - a.c ||
		(a.id < b.id ? -1 : a.id > b.id ? 1 : 0) ||
		(a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0);
	for (const entry of levels.values()) {
		for (const tier of DIFF_TIERS) entry.tiers[tier].sort(order);
	}
	return [...levels.values()].sort((a, b) => b.level - a.level);
}

export function defaultLevel(levels: readonly DiffLevel[]): number | undefined {
	let best: DiffLevel | undefined;
	for (const entry of levels) {
		if (!best || entry.count > best.count) best = entry;
	}
	return best?.level;
}
