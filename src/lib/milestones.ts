import {
	chartPoints,
	type DatedValue,
	type ScoreHistoryMap,
	shanghaiDay,
} from "./past-self";

type ChartMilestone = {
	t: number;
	kind: "ap" | "fc";
	level: number;
	id: string;
	rank: string;
	c: number;
};

type CountMilestone = {
	t: number;
	kind: "apCount" | "fcCount";
	n: number;
	id: string;
	rank: string;
};

type RksMilestone = {
	t: number;
	kind: "rks";
	at: number;
	value: number;
};

type DayMilestone = {
	t: number;
	kind: "bestDay";
	day: string;
	gain: number;
};

export type Milestone =
	| ChartMilestone
	| CountMilestone
	| RksMilestone
	| DayMilestone;

type MilestoneStart = {
	t: number;
	rks: number | null;
	ap: number;
	fc: number;
	played: number;
};

export type Milestones = { start: MilestoneStart | null; items: Milestone[] };

const COUNTS = [
	10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000,
	1200,
];
const RKS_STEP = 0.25;
const EPS = 1e-9;

type Hit = {
	t: number;
	id: string;
	rank: string;
	c: number;
	ap: boolean;
	fc: boolean;
	played: boolean;
};

const timeOf = (d: string | Date) =>
	d instanceof Date ? d.getTime() : Date.parse(d);

function countPassed(before: number, after: number): number | undefined {
	let hit: number | undefined;
	for (const n of COUNTS) if (before < n && after >= n) hit = n;
	return hit;
}

export function milestonesOf(
	rksList: readonly DatedValue[],
	history: ScoreHistoryMap,
	constantOf: (id: string, rank: string) => number | undefined,
): Milestones {
	const hits: Hit[] = [];
	for (const [id, levels] of Object.entries(history)) {
		for (const [rank, rows] of Object.entries(levels ?? {})) {
			const c = constantOf(id, rank);
			if (!c || !(c > 0)) continue;
			for (const [t, acc, score, fc] of chartPoints(rows)) {
				const ap = score >= 1_000_000 || acc >= 100;
				hits.push({ t, id, rank, c, ap, fc: fc || ap, played: score > 0 });
			}
		}
	}
	const rks: [number, number][] = [];
	for (const item of rksList) {
		const t = timeOf(item.date);
		if (Number.isFinite(t) && Number.isFinite(item.value))
			rks.push([t, item.value]);
	}
	hits.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	rks.sort((a, b) => a[0] - b[0]);
	const t0 = Math.min(hits[0]?.t ?? Infinity, rks[0]?.[0] ?? Infinity);
	if (!Number.isFinite(t0)) return { start: null, items: [] };
	const firstDay = shanghaiDay(t0);

	const state = new Map<string, { ap: boolean; fc: boolean }>();
	let ap = 0;
	let fc = 0;
	let apTop = 0;
	let fcTop = 0;
	let startT = t0;
	const items: Milestone[] = [];
	for (const h of hits) {
		const key = `${h.id}\u0000${h.rank}`;
		const was = state.get(key);
		if (!h.played && !was) continue;
		const nowAp = Boolean(was?.ap) || h.ap;
		const nowFc = Boolean(was?.fc) || h.fc;
		const base = shanghaiDay(h.t) === firstDay;
		if (base) startT = Math.max(startT, h.t);
		const level = Math.floor(h.c + EPS);
		let apNew = false;
		if (nowAp && !was?.ap) {
			if (!base && level > apTop) {
				apNew = true;
				items.push({
					t: h.t,
					kind: "ap",
					level,
					id: h.id,
					rank: h.rank,
					c: h.c,
				});
			}
			apTop = Math.max(apTop, level);
			const n = countPassed(ap, ap + 1);
			ap += 1;
			if (!base && n)
				items.push({ t: h.t, kind: "apCount", n, id: h.id, rank: h.rank });
		}
		if (nowFc && !was?.fc) {
			if (!base && level > fcTop && !apNew)
				items.push({
					t: h.t,
					kind: "fc",
					level,
					id: h.id,
					rank: h.rank,
					c: h.c,
				});
			fcTop = Math.max(fcTop, level);
			const n = countPassed(fc, fc + 1);
			fc += 1;
			if (!base && n)
				items.push({ t: h.t, kind: "fcCount", n, id: h.id, rank: h.rank });
		}
		state.set(key, { ap: nowAp, fc: nowFc });
	}

	let top = Number.NEGATIVE_INFINITY;
	let startRks: number | null = null;
	const byDay = new Map<string, { t: number; value: number }>();
	for (const [t, value] of rks) {
		byDay.set(shanghaiDay(t), { t, value });
		if (shanghaiDay(t) === firstDay) {
			top = Math.max(top, value);
			startRks = value;
			startT = Math.max(startT, t);
			continue;
		}
		const step = Math.floor((value + EPS) / RKS_STEP) * RKS_STEP;
		if (Number.isFinite(top) && step > top + EPS)
			items.push({ t, kind: "rks", at: step, value });
		top = Math.max(top, value);
	}
	let best: DayMilestone | undefined;
	let prev: number | undefined;
	for (const [day, { t, value }] of [...byDay].sort((a, b) =>
		a[0] < b[0] ? -1 : 1,
	)) {
		if (prev != null && day !== firstDay) {
			const gain = value - prev;
			if (gain > EPS && (!best || gain > best.gain + EPS))
				best = { t, kind: "bestDay", day, gain };
		}
		prev = value;
	}
	if (best) items.push(best);

	const order: Record<Milestone["kind"], number> = {
		rks: 0,
		ap: 1,
		fc: 2,
		apCount: 3,
		fcCount: 4,
		bestDay: 5,
	};
	items.sort((a, b) => b.t - a.t || order[a.kind] - order[b.kind]);
	const startAt = hits.filter((h) => shanghaiDay(h.t) === firstDay);
	const startKeys = new Map<string, { ap: boolean; fc: boolean }>();
	for (const h of startAt) {
		const key = `${h.id}\u0000${h.rank}`;
		const was = startKeys.get(key);
		startKeys.set(key, {
			ap: Boolean(was?.ap) || h.ap,
			fc: Boolean(was?.fc) || h.fc,
		});
	}
	const startList = [...startKeys.values()];
	return {
		start: {
			t: startT,
			rks: startRks,
			ap: startList.filter((s) => s.ap).length,
			fc: startList.filter((s) => s.fc).length,
			played: startList.length,
		},
		items,
	};
}
