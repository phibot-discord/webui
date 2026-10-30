import type { LevelKind } from "./const";
import { chartRks } from "./manual-score";
import type { SimBaseRecord } from "./simulation";

const PHI_SLOTS = 3;
const BEST_SLOTS = 27;
const SLOTS = PHI_SLOTS + BEST_SLOTS;

export type TargetChart = { id: string; rank: LevelKind; difficulty: number };

export type Target = {
	id: string;
	rank: LevelKind;
	difficulty: number;
	acc: number | null;
	need: number | null;
	viaAp: boolean;
	apGain: number;
};

export type TargetSet = {
	rks: number;
	goal: number;
	targets: Target[];
};

export function rksGoal(rks: number): number {
	const step = Math.floor(rks * 100) / 100 + 0.005;
	return step > rks ? step : step + 0.01;
}

export function accForRks(rks: number, difficulty: number): number {
	if (!(difficulty > 0)) return Number.POSITIVE_INFINITY;
	return 55 + 45 * Math.sqrt(Math.max(0, rks) / difficulty);
}

type Row = { key: string; acc: number; rks: number };

const keyOf = (id: string, rank: string) => `${id}\u0000${rank}`;

export function targetsFor(
	records: readonly SimBaseRecord[],
	catalog: readonly TargetChart[] = [],
): TargetSet {
	const rows = new Map<string, Row>();
	for (const [id, rank, acc, difficulty] of records) {
		if (!(difficulty > 0) || !Number.isFinite(acc)) continue;
		rows.set(keyOf(id, rank), {
			key: keyOf(id, rank),
			acc,
			rks: chartRks(acc, difficulty),
		});
	}
	const sorted = [...rows.values()].sort(
		(a, b) => b.rks - a.rks || (a.key < b.key ? -1 : 1),
	);
	const best = sorted.slice(0, BEST_SLOTS);
	const phi = sorted.filter((r) => r.acc >= 100).slice(0, PHI_SLOTS);
	const inBest = new Set(best.map((r) => r.key));
	const inPhi = new Set(phi.map((r) => r.key));
	const floorBest = best.length < BEST_SLOTS ? 0 : (best.at(-1)?.rks ?? 0);
	const floorPhi = phi.length < PHI_SLOTS ? 0 : (phi.at(-1)?.rks ?? 0);
	let sum = 0;
	for (const r of best) sum += r.rks;
	for (const r of phi) sum += r.rks;
	const rks = sum / SLOTS;
	const goal = rksGoal(rks);
	const need = goal * SLOTS - sum;

	const charts = new Map<string, TargetChart>();
	for (const chart of catalog) {
		if (chart.difficulty > 0) charts.set(keyOf(chart.id, chart.rank), chart);
	}
	for (const [id, rank, , difficulty] of records) {
		if (difficulty > 0) charts.set(keyOf(id, rank), { id, rank, difficulty });
	}

	const targets: Target[] = [];
	for (const [key, chart] of charts) {
		const had = rows.get(key);
		if (had && had.acc >= 100) continue;
		const c = chart.difficulty;
		const base = inBest.has(key) ? (had?.rks ?? 0) : floorBest;
		const bestAtAp = Math.max(0, c - base);
		const phiAtAp = inPhi.has(key) ? 0 : Math.max(0, c - floorPhi);
		const apGain = (bestAtAp + phiAtAp) / SLOTS;
		let acc = accForRks(base + need, c);
		if (acc < 70) acc = 70;
		let target: number | null = null;
		let viaAp = false;
		if (acc < 100 && (!had || acc > had.acc)) target = acc;
		else if (bestAtAp + phiAtAp >= need) {
			target = 100;
			viaAp = true;
		}
		targets.push({
			id: chart.id,
			rank: chart.rank,
			difficulty: c,
			acc: had ? had.acc : null,
			need: target,
			viaAp,
			apGain,
		});
	}
	return { rks, goal, targets };
}

export type TargetSort = "gap" | "need" | "constant" | "ap";

export function sortTargets(list: readonly Target[], by: TargetSort): Target[] {
	const reachable = (t: Target) => (t.need == null ? 1 : 0);
	const gap = (t: Target) =>
		t.need == null ? Number.POSITIVE_INFINITY : t.need - (t.acc ?? 0);
	const cmp: Record<TargetSort, (a: Target, b: Target) => number> = {
		gap: (a, b) => gap(a) - gap(b),
		need: (a, b) => (a.need ?? 101) - (b.need ?? 101),
		constant: (a, b) => b.difficulty - a.difficulty,
		ap: (a, b) => b.apGain - a.apGain,
	};
	return [...list].sort(
		(a, b) =>
			reachable(a) - reachable(b) ||
			cmp[by](a, b) ||
			b.difficulty - a.difficulty ||
			(a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
	);
}
