import type {
	RadarCategory,
	TagAnalysis,
	TagRadar,
	TagRow,
	TagScore,
} from "./b30-analysis";
import { signed } from "./card-i18n";
import { chartVoteKey, type TagVotes } from "./chart-tag-votes";

export const PROFILE = {
	below: 0.25,
	rampFrom: 80,
	rampTo: 90,
	cap: 99.9,
	bandwidth: 0.1,
	peerWindow: 0.1,
	reach: 0.2,
	minPeers: 2,
	clip: 1,
	prior: 2,
	ridge: 0.5,
	resamples: 400,
	minHold: 0.98,
	minChartVotes: 3,
	minShare: 0.1,
	minTagCharts: 4,
	minDiff: 0.03,
	slight: 0.05,
	minCharts: 12,
	listMax: 3,
	floorSlot: 27,
} as const;

const LEVELS = new Set(["EZ", "HD", "IN", "AT"]);
const EPS = 1e-9;

export type ProfileRecord = {
	id: string;
	level: string;
	difficulty: number;
	rks: number;
	acc?: number;
};

export type ChartGroup = "best" | "middle" | "worst";

export type PooledChart = ProfileRecord & {
	acc: number;
	weight: number;
	expected: number;
	diff: number;
	group: ChartGroup;
	votes: number;
};

export type TagChart = { chart: number; share: number; votes: number };

export type ProfileTagScore = TagScore & { mean: number; hold: number };

export type ProfileTagRow = ProfileTagScore & { side: TagRow["side"] };

export type ProfileCategory = ProfileTagScore & { hasVotes: boolean };

export type ProfileAnalysis = Omit<
	TagAnalysis,
	"strong" | "weak" | "tags" | "categories"
> & {
	strong: ProfileTagScore[];
	weak: ProfileTagScore[];
	tags: ProfileTagRow[];
	categories: ProfileCategory[];
};

export type ProfileDetail = {
	analysis: ProfileAnalysis;
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

function ceil1(n: number): number {
	return Math.ceil(Math.round(n * 1000) / 100 - EPS) / 10;
}

function accOf(r: ProfileRecord): number | undefined {
	if (r.acc != null && Number.isFinite(r.acc)) return r.acc;
	if (!(r.rks > 0) || !(r.difficulty > 0)) return undefined;
	return 55 + 45 * Math.sqrt(r.rks / r.difficulty);
}

export function nines(acc: number): number {
	return -Math.log10(1 - Math.min(acc, PROFILE.cap) / 100);
}

export function accOfNines(y: number): number {
	return 100 - 100 * 10 ** -y;
}

export function weightOf(acc: number): number {
	const w = (acc - PROFILE.rampFrom) / (PROFILE.rampTo - PROFILE.rampFrom);
	return Math.max(0, Math.min(1, w));
}

type Pooled = { r: ProfileRecord; acc: number; y: number; w: number };

function expectedAt(pool: readonly Pooled[], at: number): number | undefined {
	const x0 = pool[at]!.r.difficulty;
	let peers = 0;
	let sw = 0;
	let sx = 0;
	let sy = 0;
	let sxx = 0;
	let sxy = 0;
	for (let i = 0; i < pool.length; i++) {
		if (i === at) continue;
		const q = pool[i]!;
		const d = q.r.difficulty - x0;
		const dist = Math.abs(d);
		if (dist > PROFILE.reach + EPS) continue;
		if (dist <= PROFILE.peerWindow + EPS) peers += 1;
		const k = Math.exp(-0.5 * (d / PROFILE.bandwidth) ** 2) * q.w;
		sw += k;
		sx += k * d;
		sy += k * q.y;
		sxx += k * d * d;
		sxy += k * d * q.y;
	}
	if (peers < PROFILE.minPeers || sw < EPS) return undefined;
	const det = sw * sxx - sx * sx;
	if (det <= 1e-6 * sw * sw) return sy / sw;
	return (sxx * sy - sx * sxy) / det;
}

export { signed };

type Term = { w: number; r: number; shares: [number, number][] };

function solve(a: number[][], b: number[]): number[] {
	const n = b.length;
	for (let c = 0; c < n; c++) {
		let p = c;
		for (let k = c + 1; k < n; k++)
			if (Math.abs(a[k]![c]!) > Math.abs(a[p]![c]!)) p = k;
		if (p !== c) {
			[a[c], a[p]] = [a[p]!, a[c]!];
			[b[c], b[p]] = [b[p]!, b[c]!];
		}
		const pivot = a[c]![c]!;
		if (Math.abs(pivot) < 1e-12) continue;
		for (let k = c + 1; k < n; k++) {
			const f = a[k]![c]! / pivot;
			if (!f) continue;
			for (let j = c; j < n; j++) a[k]![j]! -= f * a[c]![j]!;
			b[k]! -= f * b[c]!;
		}
	}
	const x = new Array<number>(n).fill(0);
	for (let i = n - 1; i >= 0; i--) {
		let s = b[i]!;
		for (let j = i + 1; j < n; j++) s -= a[i]![j]! * x[j]!;
		x[i] = Math.abs(a[i]![i]!) < 1e-12 ? 0 : s / a[i]![i]!;
	}
	return x;
}

function fit(terms: readonly Term[], n: number): number[] {
	const a = Array.from({ length: n }, () => new Array<number>(n).fill(0));
	const b = new Array<number>(n).fill(0);
	for (const t of terms) {
		for (const [i, si] of t.shares) {
			b[i]! += t.w * si * t.r;
			const row = a[i]!;
			for (const [j, sj] of t.shares) row[j]! += t.w * si * sj;
		}
	}
	for (let i = 0; i < n; i++) a[i]![i]! += PROFILE.ridge;
	return solve(a, b);
}

function rng(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function holdsOf(terms: readonly Term[], n: number, betas: number[]) {
	const counts = new Array<number>(n).fill(0);
	if (!terms.length) return counts;
	const next = rng(terms.length * 2654435761 + n);
	for (let round = 0; round < PROFILE.resamples; round++) {
		const sample: Term[] = [];
		const present = new Set<number>();
		for (let k = 0; k < terms.length; k++) {
			const t = terms[Math.floor(next() * terms.length)]!;
			sample.push(t);
			for (const [i] of t.shares) present.add(i);
		}
		const b = fit(sample, n);
		for (let i = 0; i < n; i++) {
			if (!present.has(i) || betas[i] === 0) continue;
			if (Math.sign(b[i]!) === Math.sign(betas[i]!)) counts[i]! += 1;
		}
	}
	return counts.map((c) => c / PROFILE.resamples);
}

type Acc = {
	w: number;
	w2: number;
	s: number;
	charts: number;
	votes: number;
	best: number;
	worst: number;
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
		w2: 0,
		s: 0,
		charts: 0,
		votes: 0,
		best: 0,
		worst: 0,
		list: [],
	};
	a.w += share * pc.weight;
	a.w2 += share * share * pc.weight;
	a.s += share * pc.weight * pc.diff;
	a.charts += 1;
	a.votes += votes;
	if (pc.group === "best") a.best += 1;
	if (pc.group === "worst") a.worst += 1;
	a.list.push({ chart, share, votes });
	map.set(key, a);
}

function scoreOf(
	name: string,
	a: Acc,
	beta: number | undefined,
	hold: number,
): ProfileTagScore {
	const mean = a.s / (a.w + PROFILE.prior);
	const diff = beta == null ? mean : a.w > 0 ? beta * (a.w2 / a.w) : 0;
	return {
		name,
		diff,
		mean,
		hold,
		shown: signed(diff),
		votes: a.votes,
		charts: a.charts,
		best: a.best,
		worst: a.worst,
		slight: Math.round(Math.abs(diff) * 100) < PROFILE.slight * 100,
	};
}

function sideOf(score: ProfileTagScore): TagRow["side"] {
	if (score.charts < PROFILE.minTagCharts) return "even";
	if (score.hold < PROFILE.minHold) return "even";
	if (score.diff >= PROFILE.minDiff) return "strong";
	if (score.diff <= -PROFILE.minDiff) return "weak";
	return "even";
}

function attribute(
	byKey: Map<number, Acc>,
	terms: readonly Term[],
	keys: readonly number[],
): Map<number, { beta: number; hold: number }> {
	const betas = fit(terms, keys.length);
	const holds = holdsOf(terms, keys.length, betas);
	const out = new Map<number, { beta: number; hold: number }>();
	keys.forEach((key, i) => {
		if (byKey.has(key)) out.set(key, { beta: betas[i]!, hold: holds[i]! });
	});
	return out;
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

export function emptyProfile(): ProfileAnalysis {
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
	const min = Math.max(0, ceil1(floor - PROFILE.below));
	const pool: Pooled[] = [];
	for (const r of scored) {
		if (r.difficulty < min - EPS) continue;
		const acc = accOf(r);
		if (acc == null) continue;
		const w = weightOf(acc);
		if (w <= 0) continue;
		pool.push({ r, acc, y: nines(acc), w });
	}
	const range = {
		min,
		max: pool.reduce((m, p) => Math.max(m, p.r.difficulty), min),
	};
	const voted = pool.flatMap((p, i) => {
		const tags = votes.charts.get(chartVoteKey(p.r.id, p.r.level));
		if (!tags) return [];
		let total = 0;
		for (const v of tags.values()) total += v;
		if (total < PROFILE.minChartVotes) return [];
		const expected = expectedAt(pool, i);
		if (expected == null) return [];
		const raw = Math.max(-PROFILE.clip, Math.min(PROFILE.clip, p.y - expected));
		return [{ p, expected, raw, tags, total }];
	});
	let sumW = 0;
	let sumWR = 0;
	for (const c of voted) {
		sumW += c.p.w;
		sumWR += c.p.w * c.raw;
	}
	const mean = sumW > 0 ? sumWR / sumW : 0;
	const third = Math.floor(voted.length / 3);
	const group = new Map<number, ChartGroup>();
	const order = voted
		.map((c, i) => ({ i, d: c.raw }))
		.sort((a, b) => a.d - b.d);
	order.forEach(({ i }, k) => {
		group.set(
			i,
			k < third ? "worst" : k >= voted.length - third ? "best" : "middle",
		);
	});
	const charts: PooledChart[] = voted.map((c, i) => ({
		...c.p.r,
		acc: c.p.acc,
		weight: c.p.w,
		expected: accOfNines(c.expected),
		diff: c.raw - mean,
		group: group.get(i) ?? "middle",
		votes: c.total,
	}));
	const byTag = new Map<number, Acc>();
	const byCat = new Map<number, Acc>();
	const tagKeys: number[] = [];
	const tagIndex = new Map<number, number>();
	const tagTerms: Term[] = [];
	voted.forEach(({ tags, total }, i) => {
		const pc = charts[i]!;
		const perCat = new Map<number, number>();
		const shares: [number, number][] = [];
		for (const [tag, v] of tags) {
			for (const p of votes.tags.get(tag)?.parents ?? [])
				perCat.set(p, (perCat.get(p) ?? 0) + v);
			const share = v / total;
			if (share < PROFILE.minShare) continue;
			add(byTag, tag, i, share, v, pc);
			let index = tagIndex.get(tag);
			if (index == null) {
				index = tagKeys.length;
				tagKeys.push(tag);
				tagIndex.set(tag, index);
			}
			shares.push([index, share]);
		}
		tagTerms.push({ w: pc.weight, r: pc.diff, shares });
		let catTotal = 0;
		for (const v of perCat.values()) catTotal += v;
		for (const [cat, v] of perCat) add(byCat, cat, i, v / catTotal, v, pc);
	});
	const tagFit = attribute(byTag, tagTerms, tagKeys);
	const rows: ProfileTagRow[] = [...byTag]
		.map(([id, a]) => {
			const f = tagFit.get(id) ?? { beta: 0, hold: 0 };
			const score = scoreOf(
				votes.tags.get(id)?.name ?? String(id),
				a,
				f.beta,
				f.hold,
			);
			return { ...score, side: sideOf(score) };
		})
		.sort((a, b) => b.diff - a.diff || a.name.localeCompare(b.name));
	const strip = ({ side: _s, ...tag }: ProfileTagRow): ProfileTagScore => tag;
	const strong = rows
		.filter((t) => t.side === "strong")
		.slice(0, PROFILE.listMax)
		.map(strip);
	const weak = rows
		.filter((t) => t.side === "weak")
		.reverse()
		.slice(0, PROFILE.listMax)
		.map(strip);
	const categories: ProfileCategory[] = votes.categories.map((cat) => {
		const a = byCat.get(cat.id);
		const score: ProfileTagScore = a
			? scoreOf(cat.name, a, undefined, 1)
			: {
					name: cat.name,
					diff: 0,
					mean: 0,
					hold: 0,
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
): ProfileAnalysis {
	return tagProfileDetail(records, votes).analysis;
}
