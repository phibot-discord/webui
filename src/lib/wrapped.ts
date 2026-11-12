import type { Locale } from "@/i18n/config";
import { formatDay } from "@/i18n/datetime";
import type { ToolsMessages } from "@/i18n/tools-messages";
import { fill } from "@/phi/lib/card-i18n";
import { fCompute } from "@/phi/lib/fcompute";
import {
	type ChartPoint,
	chartPoints,
	type DatedValue,
	dayEndMs,
	type ScoreHistoryMap,
	shanghaiDay,
	valueAt,
} from "./past-self";

export type WrappedChart = {
	id: string;
	rank: string;
	c: number;
	t: number;
	acc: number;
	score: number;
	before: { acc: number; score: number } | null;
};

export type Wrapped = {
	year: number;
	status: "ok" | "none";
	from: number;
	fromBaseline: boolean;
	last: number | null;
	rks: { start: number | null; end: number | null };
	improved: number;
	newCharts: number;
	activeDays: number;
	ap: { count: number; top: WrappedChart | null };
	fc: { count: number; top: WrappedChart | null };
	jump: { day: string; since: string; gain: number } | null;
	mostImproved: (WrappedChart & { gain: number }) | null;
};

export type WrappedTile = { label: string; value: string; sub: string };

export type WrappedDay = {
	day: string;
	charts: number;
	ap: number;
	fc: number;
};

export type WrappedTimeline = {
	first: string;
	last: string;
	days: WrappedDay[];
	rks: { day: string; value: number }[];
	startRks: number | null;
};

type WrappedInput = {
	year: number;
	rks: readonly DatedValue[];
	history: ScoreHistoryMap;
	constantOf: (id: string, rank: string) => number | undefined;
};

type Scan = {
	from: number;
	fromBaseline: boolean;
	last: number | null;
	rksEnd: number | null;
	improved: number;
	newCharts: number;
	days: Map<string, WrappedDay>;
	byDay: Map<string, number>;
	aps: WrappedChart[];
	fcs: WrappedChart[];
	steps: Step[];
	jump: Wrapped["jump"];
};

type Step = WrappedChart & { gain: number };

const EPS = 1e-9;

const timeOf = (d: string | Date) =>
	d instanceof Date ? d.getTime() : Date.parse(d);

export const isAp = (p: ChartPoint) => p[2] >= 1_000_000 || p[1] >= 100;
export const isFc = (p: ChartPoint) => p[3] || isAp(p);

const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const byTop = (a: WrappedChart, b: WrappedChart) =>
	b.c - a.c || a.t - b.t || order(a.id, b.id) || order(a.rank, b.rank);

const byGain = (a: Step, b: Step) =>
	(Math.abs(a.gain - b.gain) > EPS ? b.gain - a.gain : 0) ||
	b.c - a.c ||
	order(a.id, b.id) ||
	order(a.rank, b.rank);

function pick<T>(list: readonly T[], cmp: (a: T, b: T) => number): T | null {
	let best: T | null = null;
	for (const x of list) if (best === null || cmp(x, best) < 0) best = x;
	return best;
}

export function yearRange(year: number): { start: number; end: number } {
	return {
		start: dayEndMs(`${year - 1}-12-31`)! + 1,
		end: dayEndMs(`${year}-12-31`)!,
	};
}

function scanWrapped(input: WrappedInput): Scan | null {
	const { start, end } = yearRange(input.year);

	const charts: {
		id: string;
		rank: string;
		c: number;
		points: ChartPoint[];
	}[] = [];
	for (const [id, levels] of Object.entries(input.history)) {
		for (const [rank, rows] of Object.entries(levels ?? {})) {
			const c = input.constantOf(id, rank);
			if (c === undefined || !(c > 0)) continue;
			const points = chartPoints(rows);
			if (points.length) charts.push({ id, rank, c, points });
		}
	}
	const rks: [number, number][] = [];
	for (const item of input.rks) {
		const t = timeOf(item.date);
		if (Number.isFinite(t) && Number.isFinite(item.value))
			rks.push([t, item.value]);
	}
	rks.sort((a, b) => a[0] - b[0]);

	let t0 = rks[0]?.[0] ?? Number.POSITIVE_INFINITY;
	for (const chart of charts) t0 = Math.min(t0, chart.points[0]![0]);
	if (!Number.isFinite(t0)) return null;
	const baselineEnd = dayEndMs(shanghaiDay(t0))!;
	const from = Math.max(start - 1, baselineEnd);
	if (from >= end) return null;
	const fromBaseline = baselineEnd >= start;
	const inside = (t: number) => from < t && t <= end;

	const days = new Map<string, WrappedDay>();
	const dayOf = (day: string): WrappedDay => {
		let entry = days.get(day);
		if (!entry) {
			entry = { day, charts: 0, ap: 0, fc: 0 };
			days.set(day, entry);
		}
		return entry;
	};
	let last: number | null = null;
	let improved = 0;
	let newCharts = 0;
	const aps: WrappedChart[] = [];
	const fcs: WrappedChart[] = [];
	const steps: Step[] = [];
	for (const { id, rank, c, points } of charts) {
		const before = points.filter(([t]) => t <= from).at(-1);
		const within = points.filter(([t]) => inside(t));
		const after = within.at(-1);
		if (!after) continue;
		const own = new Set<string>();
		for (const [t] of within) own.add(shanghaiDay(t));
		for (const day of own) dayOf(day).charts += 1;
		last = Math.max(last ?? after[0], after[0]);
		const had = before !== undefined && before[2] > 0;
		const was = before ? { acc: before[1], score: before[2] } : null;
		const entry = ([t, acc, score]: ChartPoint): WrappedChart => ({
			id,
			rank,
			c,
			t,
			acc,
			score,
			before: was,
		});
		if (!had && after[2] > 0) newCharts += 1;
		if (
			had &&
			(after[2] > before[2] ||
				after[1] > before[1] ||
				(isFc(after) && !isFc(before)))
		)
			improved += 1;
		const firstAp = within.find(isAp);
		if (firstAp && !(before && isAp(before))) {
			aps.push(entry(firstAp));
			dayOf(shanghaiDay(firstAp[0])).ap += 1;
		}
		const firstFc = within.find(isFc);
		if (firstFc && !(before && isFc(before))) {
			fcs.push(entry(firstFc));
			dayOf(shanghaiDay(firstFc[0])).fc += 1;
		}
		if (had && after[2] > 0) {
			const gain = fCompute.rks(after[1], c) - fCompute.rks(before[1], c);
			if (gain > EPS) steps.push({ ...entry(after), gain });
		}
	}

	const prior = rks.filter(([t]) => t <= from).at(-1);
	const rksInside = rks.filter(([t]) => inside(t));
	const rksLast = rksInside.at(-1);
	if (rksLast) last = Math.max(last ?? rksLast[0], rksLast[0]);

	const byDay = new Map<string, number>();
	for (const [t, value] of rksInside) byDay.set(shanghaiDay(t), value);
	let prev = prior ? { day: shanghaiDay(prior[0]), value: prior[1] } : null;
	let jump: Wrapped["jump"] = null;
	for (const [day, value] of byDay) {
		if (prev) {
			const gain = value - prev.value;
			if (gain > EPS && (!jump || gain > jump.gain + EPS))
				jump = { day, since: prev.day, gain };
		}
		prev = { day, value };
	}

	return {
		from,
		fromBaseline,
		last,
		rksEnd: rksLast?.[1] ?? null,
		improved,
		newCharts,
		days,
		byDay,
		aps,
		fcs,
		steps,
		jump,
	};
}

export function wrappedOf(input: WrappedInput): Wrapped {
	const { year } = input;
	const scan = scanWrapped(input);
	if (!scan) {
		return {
			year,
			status: "none",
			from: yearRange(year).start - 1,
			fromBaseline: false,
			last: null,
			rks: { start: null, end: null },
			improved: 0,
			newCharts: 0,
			activeDays: 0,
			ap: { count: 0, top: null },
			fc: { count: 0, top: null },
			jump: null,
			mostImproved: null,
		};
	}
	return {
		year,
		status: scan.last === null ? "none" : "ok",
		from: scan.from,
		fromBaseline: scan.fromBaseline,
		last: scan.last,
		rks: { start: valueAt(input.rks, scan.from), end: scan.rksEnd },
		improved: scan.improved,
		newCharts: scan.newCharts,
		activeDays: scan.days.size,
		ap: { count: scan.aps.length, top: pick(scan.aps, byTop) },
		fc: { count: scan.fcs.length, top: pick(scan.fcs, byTop) },
		jump: scan.jump,
		mostImproved: pick(scan.steps, byGain),
	};
}

export function wrappedTimelineOf(input: WrappedInput): WrappedTimeline | null {
	const scan = scanWrapped(input);
	if (!scan || scan.last === null) return null;
	return {
		first: shanghaiDay(scan.from + 1),
		last: shanghaiDay(scan.last),
		days: [...scan.days.values()].sort((a, b) => order(a.day, b.day)),
		rks: [...scan.byDay]
			.map(([day, value]) => ({ day, value }))
			.sort((a, b) => order(a.day, b.day)),
		startRks: valueAt(input.rks, scan.from),
	};
}

export function wrappedTiles(
	w: Wrapped,
	t: ToolsMessages["wrapped"],
	nameOf: (id: string) => string,
	locale: Locale,
): WrappedTile[] {
	if (w.status === "none") return [];
	const level = (x: WrappedChart) => `${x.rank} ${x.c.toFixed(1)}`;
	const chart = (x: WrappedChart) => `${level(x)} ${nameOf(x.id)}`;
	const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(4)}`;
	const thin = (label: string): WrappedTile => ({
		label,
		value: "—",
		sub: t.thin,
	});
	const count = (label: string, n: number): WrappedTile => ({
		label,
		value: String(n),
		sub: "",
	});
	const hardest = (
		label: string,
		x: { count: number; top: WrappedChart | null },
	): WrappedTile => ({
		label,
		value: String(x.count),
		sub: x.top ? fill(t.hardest, { chart: chart(x.top) }) : "",
	});
	const { start, end } = w.rks;
	const rks: WrappedTile =
		end === null
			? thin(t.rks)
			: start === null
				? { label: t.rks, value: end.toFixed(4), sub: "" }
				: {
						label: t.rks,
						value: `${start.toFixed(4)} → ${end.toFixed(4)}`,
						sub: signed(end - start),
					};
	const jump: WrappedTile = w.jump
		? {
				label: t.jump,
				value: formatDay(w.jump.day, locale),
				sub: fill(t.jumpSub, {
					gain: signed(w.jump.gain),
					since: formatDay(w.jump.since, locale),
				}),
			}
		: thin(t.jump);
	const x = w.mostImproved;
	const step: WrappedTile = x
		? {
				label: t.mostImproved,
				value: nameOf(x.id),
				sub: x.before
					? `${level(x)} · ${x.before.acc.toFixed(2)}% → ${x.acc.toFixed(2)}%`
					: `${level(x)} · ${x.acc.toFixed(2)}%`,
			}
		: thin(t.mostImproved);
	return [
		rks,
		count(t.improved, w.improved),
		count(t.newCharts, w.newCharts),
		count(t.activeDays, w.activeDays),
		hardest(t.ap, w.ap),
		hardest(t.fc, w.fc),
		jump,
		step,
	];
}
