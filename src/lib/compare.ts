import { type ChartStatus, chartStatus } from "./chart-status";

export type CompareRecord = [
	id: string,
	rank: string,
	acc: number,
	score: number,
	fc: boolean,
	constant: number,
	rks: number,
];

export type CompareSide = {
	name: string;
	rks: number | null;
	challenge: number;
	records: CompareRecord[];
};

export type LevelTally = Record<"played" | "clear" | "fc" | "ap", number>;

export type HeadToHead = {
	id: string;
	rank: string;
	constant: number;
	a: { acc: number; score: number; status: ChartStatus };
	b: { acc: number; score: number; status: ChartStatus };
	diff: number;
};

export type CompareResult = {
	tallies: { rank: string; a: LevelTally; b: LevelTally }[];
	both: HeadToHead[];
	wins: { a: number; b: number; ties: number };
	onlyA: number;
	onlyB: number;
	best: { a: CompareRecord[]; b: CompareRecord[] };
};

const RANKS = ["EZ", "HD", "IN", "AT"];
const BEST = 30;

const keyOf = (r: CompareRecord) => `${r[0]}\u0000${r[1]}`;

function tally(records: readonly CompareRecord[], rank: string): LevelTally {
	const out: LevelTally = { played: 0, clear: 0, fc: 0, ap: 0 };
	for (const r of records) {
		if (r[1] !== rank || !(r[3] > 0)) continue;
		const status = chartStatus({ score: r[3], fc: r[4] });
		out.played++;
		if (status !== "played") out.clear++;
		if (status === "fc" || status === "ap") out.fc++;
		if (status === "ap") out.ap++;
	}
	return out;
}

export function bestOf(records: readonly CompareRecord[]): CompareRecord[] {
	return [...records]
		.filter((r) => r[6] > 0)
		.sort((x, y) => y[6] - x[6] || (keyOf(x) < keyOf(y) ? -1 : 1))
		.slice(0, BEST);
}

export function compareSides(a: CompareSide, b: CompareSide): CompareResult {
	const mapB = new Map(b.records.map((r) => [keyOf(r), r] as const));
	const both: HeadToHead[] = [];
	const wins = { a: 0, b: 0, ties: 0 };
	let onlyA = 0;
	for (const ra of a.records) {
		if (!(ra[3] > 0)) continue;
		const rb = mapB.get(keyOf(ra));
		if (!rb || !(rb[3] > 0)) {
			onlyA++;
			continue;
		}
		const diff = Math.round((ra[2] - rb[2]) * 1e4) / 1e4;
		if (diff > 0) wins.a++;
		else if (diff < 0) wins.b++;
		else wins.ties++;
		both.push({
			id: ra[0],
			rank: ra[1],
			constant: ra[5],
			a: {
				acc: ra[2],
				score: ra[3],
				status: chartStatus({ score: ra[3], fc: ra[4] }),
			},
			b: {
				acc: rb[2],
				score: rb[3],
				status: chartStatus({ score: rb[3], fc: rb[4] }),
			},
			diff,
		});
	}
	const inBoth = new Set(both.map((h) => `${h.id}\u0000${h.rank}`));
	const onlyB = b.records.filter(
		(r) => r[3] > 0 && !inBoth.has(keyOf(r)),
	).length;
	both.sort(
		(x, y) =>
			Math.abs(y.diff) - Math.abs(x.diff) ||
			y.constant - x.constant ||
			(x.id < y.id ? -1 : 1),
	);
	return {
		tallies: RANKS.map((rank) => ({
			rank,
			a: tally(a.records, rank),
			b: tally(b.records, rank),
		})),
		both,
		wins,
		onlyA,
		onlyB,
		best: { a: bestOf(a.records), b: bestOf(b.records) },
	};
}

export function slugFromInput(raw: string): string | undefined {
	const text = raw.trim();
	if (!text) return undefined;
	const fromUrl = text.match(/\/p\/([A-Za-z0-9_-]{8,21})(?:[/?#]|$)/);
	const slug = fromUrl ? fromUrl[1] : text;
	return slug && /^[A-Za-z0-9_-]{8,21}$/.test(slug) ? slug : undefined;
}
