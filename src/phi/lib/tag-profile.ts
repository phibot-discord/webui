import type {
	RadarCategory,
	TagAnalysis,
	TagRadar,
	TagRow,
	TagScore,
} from "./b30-analysis";
import { chartVoteKey, type TagVotes } from "./chart-tag-votes";
import { signed } from "./card-i18n";

export const PROFILE = {
	below: 1.0,
	above: 2.0,
	bandwidth: 0.4,
	clip: 1.5,
	prior: 2,
	minChartVotes: 3,
	minShare: 0.1,
	minTagCharts: 4,
	minGroupCharts: 3,
	minDiff: 0.03,
	slight: 0.1,
	minCharts: 12,
	listMax: 3,
	floorSlot: 27,
} as const;

const LEVELS = new Set(["EZ", "HD", "IN", "AT"]);

export type ProfileRecord = {
	id: string;
	level: string;
	difficulty: number;
	rks: number;
	acc?: number;
};

export type ChartGroup = "best" | "middle" | "worst";

export type PooledChart = ProfileRecord & {
	expected: number;
	diff: number;
	group: ChartGroup;
	votes: number;
};

export type TagChart = { chart: number; share: number; votes: number };

export type ProfileDetail = {
	analysis: TagAnalysis;
	charts: PooledChart[];
	byTag: Map<string, TagChart[]>;
	byCategory: Map<string, TagChart[]>;
};

type LooseRecord = {
	rank?: string;
	rks?: number;
	difficulty?: number;
	acc?: number;
} | null;

export function profileRecordsOf(
	gameRecord: Record<string, readonly (LooseRecord | undefined)[]>,
): ProfileRecord[] {
	const out: ProfileRecord[] = [];
	for (const [id, rows] of Object.entries(gameRecord)) {
		for (const row of rows) {
			if (!row?.rank || !LEVELS.has(row.rank)) continue;
			const difficulty = Number(row.difficulty);
			const rks = Number(row.rks);
			if (!(difficulty > 0) || !Number.isFinite(rks)) continue;
			const acc = Number(row.acc);
			out.push({
				id,
				level: row.rank,
				difficulty,
				rks,
				...(row.acc != null && Number.isFinite(acc) ? { acc } : {}),
			});
		}
	}
	return out;
}

function round1(n: number, dir: "floor" | "ceil"): number {
	return Math[dir](Math.round(n * 1000) / 100) / 10;
}

function expectedAt(pool: readonly ProfileRecord[], at: number): number {
	const h = PROFILE.bandwidth;
	const x0 = pool[at]!.difficulty;
	let sw = 0;
	let sx = 0;
	let sy = 0;
	let sxx = 0;
	let sxy = 0;
	for (let i = 0; i < pool.length; i++) {
		if (i === at) continue;
		const q = pool[i]!;
		const d = q.difficulty - x0;
		const k = Math.exp(-0.5 * (d / h) ** 2);
		sw += k;
		sx += k * d;
		sy += k * q.rks;
		sxx += k * d * d;
		sxy += k * d * q.rks;
	}
	if (sw < 1e-9) return pool[at]!.rks;
	const det = sw * sxx - sx * sx;
	if (det <= 1e-9 * sw * sw) return sy / sw;
	return (sxx * sy - sx * sxy) / det;
}

export { signed };

type Acc = {
	w: number;
	s: number;
	charts: number;
	votes: number;
	best: number;
	worst: number;
	wBest: number;
	wWorst: number;
	list: TagChart[];
};

function add(
	map: Map<number, Acc>,
	key: number,
	chart: number,
	share: number,
	votes: number,
	pc: PooledChart,
) {
	const a = map.get(key) ?? {
		w: 0,
		s: 0,
		charts: 0,
		votes: 0,
		best: 0,
		worst: 0,
		wBest: 0,
		wWorst: 0,
		list: [],
	};
	a.w += share;
	a.s += share * pc.diff;
	a.charts += 1;
	a.votes += votes;
	if (pc.group === "best") {
		a.best += 1;
		a.wBest += share;
	}
	if (pc.group === "worst") {
		a.worst += 1;
		a.wWorst += share;
	}
	a.list.push({ chart, share, votes });
	map.set(key, a);
}

function scoreOf(name: string, a: Acc): TagScore {
	const diff = a.s / (a.w + PROFILE.prior);
	return {
		name,
		diff,
		shown: signed(diff),
		votes: a.votes,
		charts: a.charts,
		best: a.best,
		worst: a.worst,
		slight: Math.round(Math.abs(diff) * 100) < PROFILE.slight * 100,
	};
}

function sideOf(score: TagScore, a: Acc): TagRow["side"] {
	if (score.charts < PROFILE.minTagCharts) return "even";
	const leanBest = (a.wBest + 1 / 3) / (a.w + 1) > 1 / 3;
	const leanWorst = (a.wWorst + 1 / 3) / (a.w + 1) > 1 / 3;
	if (
		score.diff >= PROFILE.minDiff &&
		a.best >= PROFILE.minGroupCharts &&
		leanBest
	)
		return "strong";
	if (
		score.diff <= -PROFILE.minDiff &&
		a.worst >= PROFILE.minGroupCharts &&
		leanWorst
	)
		return "weak";
	return "even";
}

const CX = 100;
const CY = 92;
const R = 55;
const LABEL_R = 78;

function fmt(n: number): string {
	return n.toFixed(1);
}

export function radarGeometry(
	rows: { name: string; diff: number; hasVotes: boolean; votes: number }[],
): TagRadar {
	const n = rows.length;
	if (n < 3) return { grids: [], axes: [], points: "", categories: [] };
	const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
	const at = (i: number, r: number) => ({
		x: CX + r * Math.cos(angle(i)),
		y: CY + r * Math.sin(angle(i)),
	});
	const ring = (f: number) =>
		rows
			.map((_, i) => {
				const p = at(i, R * f);
				return `${fmt(p.x)},${fmt(p.y)}`;
			})
			.join(" ");
	const span = Math.max(
		0.15,
		...rows.filter((r) => r.hasVotes).map((r) => Math.abs(r.diff)),
	);
	const categories: RadarCategory[] = rows.map((row, i) => {
		const f = row.hasVotes
			? 0.55 + 0.45 * Math.max(-1, Math.min(1, row.diff / span))
			: 0.55;
		const point = at(i, R * f);
		const label = at(i, LABEL_R);
		const cos = Math.cos(angle(i));
		return {
			name: row.name,
			diff: row.diff,
			votes: row.votes,
			hasVotes: row.hasVotes,
			shown: row.hasVotes ? signed(row.diff) : "–",
			pointX: point.x,
			pointY: point.y,
			labelX: label.x,
			labelY: label.y,
			anchor: Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end",
		};
	});
	return {
		grids: [0.25, 0.5, 0.75, 1].map(ring),
		axes: rows.map((_, i) => {
			const p = at(i, R);
			return { x: Number(fmt(p.x)), y: Number(fmt(p.y)) };
		}),
		points: categories
			.map((c) => `${fmt(c.pointX)},${fmt(c.pointY)}`)
			.join(" "),
		categories,
	};
}

export function emptyProfile(): TagAnalysis {
	return {
		recordCount: 0,
		chartCount: 0,
		totalVotes: 0,
		averageRks: 0,
		categories: [],
		radar: { grids: [], axes: [], points: "", categories: [] },
		strong: [],
		weak: [],
		tags: [],
		insufficient: true,
	};
}

export function tagProfileDetail(
	records: readonly ProfileRecord[],
	votes: TagVotes,
): ProfileDetail {
	const none = {
		charts: [],
		byTag: new Map<string, TagChart[]>(),
		byCategory: new Map<string, TagChart[]>(),
	};
	const scored = records.filter(
		(r) =>
			LEVELS.has(r.level) &&
			Number.isFinite(r.difficulty) &&
			r.difficulty > 0 &&
			Number.isFinite(r.rks),
	);
	if (!scored.length) return { analysis: emptyProfile(), ...none };
	const best = scored.map((r) => r.rks).sort((a, b) => b - a);
	const top = best.slice(0, PROFILE.floorSlot);
	const floor = top.at(-1)!;
	const averageRks = top.reduce((s, v) => s + v, 0) / top.length;
	const range = {
		min: Math.max(0, round1(floor - PROFILE.below, "floor")),
		max: round1(floor + PROFILE.above, "ceil"),
	};
	const pool = scored.filter(
		(r) => r.difficulty >= range.min && r.difficulty <= range.max,
	);
	const voted = pool.flatMap((r, i) => {
		const tags = votes.charts.get(chartVoteKey(r.id, r.level));
		if (!tags) return [];
		let total = 0;
		for (const v of tags.values()) total += v;
		if (total < PROFILE.minChartVotes) return [];
		const expected = expectedAt(pool, i);
		const raw = Math.max(
			-PROFILE.clip,
			Math.min(PROFILE.clip, r.rks - expected),
		);
		return [{ r, expected, raw, tags, total }];
	});
	const mean = voted.length
		? voted.reduce((s, c) => s + c.raw, 0) / voted.length
		: 0;
	const third = Math.floor(voted.length / 3);
	const group = new Map<number, ChartGroup>();
	voted
		.map((c, i) => ({ i, d: c.raw }))
		.sort((a, b) => a.d - b.d)
		.forEach(({ i }, k) =>
			group.set(
				i,
				k < third ? "worst" : k >= voted.length - third ? "best" : "middle",
			),
		);
	const charts: PooledChart[] = voted.map((c, i) => ({
		...c.r,
		expected: c.expected,
		diff: c.raw - mean,
		group: group.get(i) ?? "middle",
		votes: c.total,
	}));
	const byTag = new Map<number, Acc>();
	const byCat = new Map<number, Acc>();
	voted.forEach(({ tags, total }, i) => {
		const pc = charts[i]!;
		const perCat = new Map<number, number>();
		for (const [tag, v] of tags) {
			for (const p of votes.tags.get(tag)?.parents ?? [])
				perCat.set(p, (perCat.get(p) ?? 0) + v);
			const share = v / total;
			if (share >= PROFILE.minShare) add(byTag, tag, i, share, v, pc);
		}
		let catTotal = 0;
		for (const v of perCat.values()) catTotal += v;
		for (const [cat, v] of perCat) add(byCat, cat, i, v / catTotal, v, pc);
	});
	const rows: TagRow[] = [...byTag]
		.map(([id, a]) => {
			const score = scoreOf(votes.tags.get(id)?.name ?? String(id), a);
			return { ...score, side: sideOf(score, a) };
		})
		.sort((a, b) => b.diff - a.diff || a.name.localeCompare(b.name));
	const strip = ({ side: _s, ...tag }: TagRow): TagScore => tag;
	const strong = rows
		.filter((t) => t.side === "strong")
		.slice(0, PROFILE.listMax)
		.map(strip);
	const weak = rows
		.filter((t) => t.side === "weak")
		.reverse()
		.slice(0, PROFILE.listMax)
		.map(strip);
	const categories = votes.categories.map((cat) => {
		const a = byCat.get(cat.id);
		const score: TagScore = a
			? scoreOf(cat.name, a)
			: {
					name: cat.name,
					diff: 0,
					shown: "–",
					votes: 0,
					charts: 0,
					best: 0,
					worst: 0,
					slight: true,
				};
		return { ...score, hasVotes: Boolean(a) };
	});
	const tagLists = new Map<string, TagChart[]>();
	for (const [id, a] of byTag)
		tagLists.set(votes.tags.get(id)?.name ?? String(id), a.list);
	const catLists = new Map<string, TagChart[]>();
	for (const cat of votes.categories) {
		const a = byCat.get(cat.id);
		if (a) catLists.set(cat.name, a.list);
	}
	return {
		analysis: {
			range,
			recordCount: pool.length,
			chartCount: voted.length,
			totalVotes: voted.reduce((s, c) => s + c.total, 0),
			averageRks,
			categories,
			radar: radarGeometry(categories),
			strong,
			weak,
			tags: rows,
			insufficient: voted.length < PROFILE.minCharts,
		},
		charts,
		byTag: tagLists,
		byCategory: catLists,
	};
}

export function tagProfile(
	records: readonly ProfileRecord[],
	votes: TagVotes,
): TagAnalysis {
	return tagProfileDetail(records, votes).analysis;
}
