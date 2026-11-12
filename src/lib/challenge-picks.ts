export type ChallengeRecord = {
	id: string;
	rank: string;
	difficulty: number;
	acc: number;
};

export type ChallengeChart = {
	id: string;
	rank: string;
	level: number;
	acc: number;
};

export type ChallengePick = {
	sum: number;
	charts: ChallengeChart[];
	total: number;
	color: number;
};

export const CHALLENGE_CUTS: readonly number[] = [
	0, 2_460_000, 2_700_000, 2_850_000, 2_940_000, 3_000_000,
];

const PER_LEVEL = 3;
const POINTS_PER_ACC = 10_000;

export function challengeColor(total: number): number {
	let color = 0;
	for (let i = 1; i < CHALLENGE_CUTS.length; i++) {
		if (total >= (CHALLENGE_CUTS[i] ?? Number.POSITIVE_INFINITY)) color = i;
	}
	return color;
}

export function challengePicks(
	records: readonly ChallengeRecord[],
	rows = 8,
): ChallengePick[] {
	const byLevel = new Map<number, ChallengeChart[]>();
	for (const r of records) {
		const level = Math.floor(r.difficulty);
		if (!(level > 0) || !(r.acc > 0)) continue;
		const list = byLevel.get(level) ?? [];
		list.push({ id: r.id, rank: r.rank, level, acc: r.acc });
		byLevel.set(level, list);
	}
	const pool = [...byLevel.keys()]
		.sort((a, b) => b - a)
		.flatMap((level) =>
			(byLevel.get(level) ?? [])
				.sort(
					(a, b) =>
						b.acc - a.acc ||
						a.id.localeCompare(b.id) ||
						a.rank.localeCompare(b.rank),
				)
				.slice(0, PER_LEVEL),
		);
	const best = new Map<number, ChallengePick>();
	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			for (let k = j + 1; k < pool.length; k++) {
				const a = pool[i];
				const b = pool[j];
				const c = pool[k];
				if (!a || !b || !c) continue;
				const sum = a.level + b.level + c.level;
				const total = Math.round((a.acc + b.acc + c.acc) * POINTS_PER_ACC);
				const had = best.get(sum);
				if (!had || total > had.total) {
					best.set(sum, {
						sum,
						charts: [a, b, c],
						total,
						color: challengeColor(total),
					});
				}
			}
		}
	}
	return [...best.values()].sort((x, y) => y.sum - x.sum).slice(0, rows);
}
