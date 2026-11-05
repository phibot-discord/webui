import type {
	RadarCategory,
	TagAnalysis,
	TagRadar,
	TagRow,
	TagScore,
} from "./b30-analysis";
import { signed } from "./card-i18n";
import { chartVoteKey, type TagVotes } from "./chart-tag-votes";
import { fCompute } from "./fcompute";

export const PROFILE = {
	below: 0.25,
	rampFrom: 80,
	rampTo: 90,
	cap: 99.9,
	step: 0.1,
	smooth: 30,
	flat: 0.01,
	rounds: 30,
	prior: 2,
	ridge: 0.5,
	resamples: 400,
	minHold: 0.9,
	firmHold: 0.99,
	minChartVotes: 3,
	minShare: 0.05,
	minTagCharts: 4,
	minDiff: 0.03,
	minFaint: 0.005,
	slight: 0.05,
	minCharts: 12,
	minFree: 3,
	listMax: 3,
	floorSlot: 27,
} as const;

const LEVELS = new Set(["EZ", "HD", "IN", "AT"]);
const EPS = 1e-9;
const CAP_Y = -Math.log10(1 - PROFILE.cap / 100);

export type ProfileRecord = {
	id: string;
	level: string;
	difficulty: number;
	rks: number;
	acc?: number;
};

export type ProfileBasis = "scores" | "history" | "aps";

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

export type ProfileTagScore = TagScore & {
	mean: number;
	hold: number;
	firm: boolean;
	faint: boolean;
};

export type ProfileTagRow = ProfileTagScore & { side: TagRow["side"] };

export type ProfileCategory = ProfileTagScore & { hasVotes: boolean };

export type ProfileAnalysis = Omit<
	TagAnalysis,
	"strong" | "weak" | "tags" | "categories" | "basis"
> & {
	strong: ProfileTagScore[];
	weak: ProfileTagScore[];
	tags: ProfileTagRow[];
	categories: ProfileCategory[];
	basis: ProfileBasis;
	asOf?: string;
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

export { signed };

type Pooled = {
	r: ProfileRecord;
	acc: number;
	y: number;
	w: number;
	capped: boolean;
};

type Pool = {
	pool: Pooled[];
	min: number;
	averageRks: number;
	free: number;
};

function poolOf(records: readonly ProfileRecord[]): Pool | undefined {
	const scored = records.filter(
		(r) =>
			LEVELS.has(r.level) &&
			Number.isFinite(r.difficulty) &&
			r.difficulty > 0 &&
			Number.isFinite(r.rks),
	);
	if (!scored.length) return undefined;
	const best = scored.map((r) => r.rks).sort((a, b) => b - a);
	const top = best.slice(0, PROFILE.floorSlot);
	const floor = top.at(-1)!;
	const averageRks = top.reduce((s, v) => s + v, 0) / top.length;
	const min = Math.max(0, ceil1(floor - PROFILE.below));
	const pool: Pooled[] = [];
	let free = 0;
	for (const r of scored) {
		if (r.difficulty < min - EPS) continue;
		const acc = accOf(r);
		if (acc == null) continue;
		const w = weightOf(acc);
		if (w <= 0) continue;
		const capped = acc >= PROFILE.cap - EPS;
		if (!capped) free += 1;
		pool.push({ r, acc, y: nines(acc), w, capped });
	}
	return { pool, min, averageRks, free };
}

type Row = {
	p: Pooled;
	curve: [number, number][];
	shares: [number, number][];
	x: [number, number][];
};

type Knobs = { smooth: number; flat: number; ridge: number };

type Fit = { theta: number[]; l: Float64Array };

function cholesky(a: Float64Array, n: number): Float64Array {
	const l = new Float64Array(n * n);
	const first = new Int32Array(n);
	for (let i = 0; i < n; i++) {
		let k = 0;
		while (k < i && a[i * n + k] === 0) k++;
		first[i] = k;
	}
	for (let j = 0; j < n; j++) {
		const rj = j * n;
		const fj = first[j]!;
		let s = a[rj + j]!;
		for (let k = fj; k < j; k++) s -= l[rj + k]! * l[rj + k]!;
		const d = Math.sqrt(Math.max(s, 1e-12));
		l[rj + j] = d;
		for (let i = j + 1; i < n; i++) {
			const fi = first[i]!;
			if (fi > j) continue;
			const ri = i * n;
			let t = a[ri + j]!;
			for (let k = Math.max(fi, fj); k < j; k++) t -= l[ri + k]! * l[rj + k]!;
			l[ri + j] = t / d;
		}
	}
	return l;
}

function solveWith(
	l: Float64Array,
	n: number,
	b: ArrayLike<number>,
): number[] {
	const y = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		const ri = i * n;
		let s = b[i]!;
		for (let k = 0; k < i; k++) s -= l[ri + k]! * y[k]!;
		y[i] = s / l[ri + i]!;
	}
	const x = new Array<number>(n).fill(0);
	for (let i = n - 1; i >= 0; i--) {
		let s = y[i]!;
		for (let k = i + 1; k < n; k++) s -= l[k * n + i]! * x[k]!;
		x[i] = s / l[i * n + i]!;
	}
	return x;
}

function fit(
	rows: readonly Row[],
	targets: readonly number[],
	knots: number,
	tags: number,
	knobs: Knobs,
): Fit {
	const n = knots + tags;
	const a = new Float64Array(n * n);
	const b = new Float64Array(n);
	rows.forEach((row, i) => {
		const t = targets[i]!;
		const w = row.p.w;
		for (const [p, fp] of row.x) {
			b[p]! += w * fp * t;
			const rp = p * n;
			for (const [q, fq] of row.x) a[rp + q]! += w * fp * fq;
		}
	});
	const c = [1, -2, 1];
	for (let k = 1; k + 1 < knots; k++) {
		for (let p = 0; p < 3; p++)
			for (let q = 0; q < 3; q++)
				a[(k - 1 + p) * n + (k - 1 + q)]! += knobs.smooth * c[p]! * c[q]!;
	}
	for (let k = 0; k + 1 < knots; k++) {
		a[k * n + k]! += knobs.flat;
		a[(k + 1) * n + k + 1]! += knobs.flat;
		a[k * n + k + 1]! -= knobs.flat;
		a[(k + 1) * n + k]! -= knobs.flat;
	}
	for (let k = 0; k < knots; k++) a[k * n + k]! += 1e-6;
	for (let t = 0; t < tags; t++) a[(knots + t) * n + knots + t]! += knobs.ridge;
	const l = cholesky(a, n);
	return { theta: solveWith(l, n, b), l };
}

function curveAt(row: Row, theta: readonly number[]): number {
	let g = 0;
	for (const [k, f] of row.curve) g += theta[k]! * f;
	return g;
}

function tagPart(row: Row, theta: readonly number[], knots: number): number {
	let s = 0;
	for (const [j, sh] of row.shares) s += theta[knots + j]! * sh;
	return s;
}

function shiftOf(
	rows: readonly Row[],
	theta: readonly number[],
	knots: number,
) {
	let sw = 0;
	let st = 0;
	for (const row of rows) {
		if (!row.shares.length) continue;
		sw += row.p.w;
		st += row.p.w * tagPart(row, theta, knots);
	}
	return sw > 0 ? st / sw : 0;
}

function predict(row: Row, theta: readonly number[]): number {
	let v = 0;
	for (const [k, f] of row.x) v += theta[k]! * f;
	return v;
}

function fitCensored(
	rows: readonly Row[],
	start: readonly number[],
	knots: number,
	tags: number,
	knobs: Knobs,
	censor: boolean,
): Fit & { targets: number[]; used: boolean[] } {
	if (!censor) {
		const f = fit(rows, start, knots, tags, knobs);
		return { ...f, targets: [...start], used: rows.map(() => true) };
	}
	const fitActive = (active: readonly boolean[]) => {
		const pick = rows.filter((_, i) => active[i]);
		return fit(
			pick,
			pick.map((row) => (row.p.capped ? CAP_Y : row.p.y)),
			knots,
			tags,
			knobs,
		);
	};
	let active = rows.map((row, i) => !row.p.capped || start[i]! <= CAP_Y + EPS);
	let f = fitActive(active);
	for (let round = 1; round < PROFILE.rounds; round++) {
		const next = rows.map(
			(row) => !row.p.capped || predict(row, f.theta) < CAP_Y,
		);
		if (next.every((v, i) => v === active[i])) break;
		active = next;
		f = fitActive(active);
	}
	const targets = rows.map((row) =>
		row.p.capped ? Math.max(CAP_Y, predict(row, f.theta)) : row.p.y,
	);
	return { ...f, targets, used: active };
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

function holdsOf(
	rows: readonly Row[],
	start: readonly number[],
	knots: number,
	tags: number,
	knobs: Knobs,
	censor: boolean,
	betas: readonly number[],
) {
	const counts = new Array<number>(tags).fill(0);
	if (!rows.length || !tags) return counts;
	const next = rng(rows.length * 2654435761 + tags);
	for (let round = 0; round < PROFILE.resamples; round++) {
		const sample: Row[] = [];
		const sampleStart: number[] = [];
		const present = new Set<number>();
		for (let k = 0; k < rows.length; k++) {
			const i = Math.floor(next() * rows.length);
			const row = rows[i]!;
			sample.push(row);
			sampleStart.push(start[i]!);
			for (const [j] of row.shares) present.add(j);
		}
		const { theta } = fitCensored(
			sample,
			sampleStart,
			knots,
			tags,
			knobs,
			censor,
		);
		const shift = shiftOf(sample, theta, knots);
		for (let t = 0; t < tags; t++) {
			if (!present.has(t) || betas[t] === 0) continue;
			if (Math.sign(theta[knots + t]! - shift) === Math.sign(betas[t]!))
				counts[t]! += 1;
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
	aps: boolean,
): ProfileTagScore {
	const mean = aps ? 0 : a.s / (a.w + PROFILE.prior);
	const diff = beta == null ? mean : a.w > 0 ? beta * (a.w2 / a.w) : 0;
	const firm = !aps && hold >= PROFILE.firmHold;
	return {
		name,
		diff,
		mean,
		hold,
		firm,
		faint: aps || Math.abs(diff) < PROFILE.minDiff,
		shown: aps ? "" : signed(diff),
		votes: a.votes,
		charts: a.charts,
		best: a.best,
		worst: a.worst,
		slight: aps || Math.round(Math.abs(diff) * 100) < PROFILE.slight * 100,
	};
}

function sideOf(score: ProfileTagScore): TagRow["side"] {
	if (score.charts < PROFILE.minTagCharts) return "even";
	if (score.hold < PROFILE.minHold) return "even";
	if (score.diff >= PROFILE.minFaint) return "strong";
	if (score.diff <= -PROFILE.minFaint) return "weak";
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
		basis: "scores",
	};
}

function curveRows(pool: readonly Pooled[]) {
	const xs = pool.map((p) => p.r.difficulty);
	const lo = Math.floor(Math.min(...xs) / PROFILE.step + EPS) * PROFILE.step;
	const hi = Math.ceil(Math.max(...xs) / PROFILE.step - EPS) * PROFILE.step;
	const knots = Math.max(1, Math.round((hi - lo) / PROFILE.step) + 1);
	const curve = (x: number): [number, number][] => {
		if (knots === 1) return [[0, 1]];
		const u = (x - lo) / PROFILE.step;
		const k = Math.min(knots - 2, Math.max(0, Math.floor(u + EPS)));
		const f = Math.max(0, Math.min(1, u - k));
		return [
			[k, 1 - f],
			[k + 1, f],
		];
	};
	return { knots, curve };
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
	const built = poolOf(records);
	if (!built) return { analysis: emptyProfile(), ...none };
	const { pool, min, averageRks, free } = built;
	const range = {
		min,
		max: pool.reduce((m, p) => Math.max(m, p.r.difficulty), min),
	};
	const aps = free < PROFILE.minFree;
	const tagKeys: number[] = [];
	const tagIndex = new Map<number, number>();
	const { knots, curve } =
		pool.length && !aps
			? curveRows(pool)
			: { knots: 1, curve: (): [number, number][] => [[0, 1]] };
	const rows: Row[] = [];
	const voted: { row: number; tags: Map<number, number>; total: number }[] = [];
	for (const p of pool) {
		const tags = votes.charts.get(chartVoteKey(p.r.id, p.r.level));
		let total = 0;
		for (const v of tags?.values() ?? []) total += v;
		const shares: [number, number][] = [];
		if (tags && total >= PROFILE.minChartVotes) {
			for (const [tag, v] of tags) {
				const share = v / total;
				if (share < PROFILE.minShare) continue;
				let index = tagIndex.get(tag);
				if (index == null) {
					index = tagKeys.length;
					tagKeys.push(tag);
					tagIndex.set(tag, index);
				}
				shares.push([index, share]);
			}
			voted.push({ row: rows.length, tags, total });
		}
		rows.push({ p, curve: curve(p.r.difficulty), shares, x: [] });
	}
	const T = tagKeys.length;
	for (const row of rows)
		row.x = [
			...row.curve,
			...row.shares.map(([j, sh]): [number, number] => [knots + j, sh]),
		];
	const knobs: Knobs = {
		smooth: PROFILE.smooth,
		flat: PROFILE.flat,
		ridge: PROFILE.ridge,
	};
	let centre = 0;
	if (aps) {
		let sw = 0;
		let sx = 0;
		for (const p of pool) {
			sw += p.w;
			sx += p.w * p.r.difficulty;
		}
		centre = sw > 0 ? sx / sw : 0;
	}
	const start = pool.map((p) => (aps ? p.r.difficulty - centre : p.y));
	const main = fitCensored(rows, start, knots, T, knobs, !aps);
	const mainShift = shiftOf(rows, main.theta, knots);
	const betas = main.theta.slice(knots).map((b) => b - mainShift);
	const holds = holdsOf(rows, main.targets, knots, T, knobs, !aps, betas);
	const n = knots + T;
	const own = voted.map(({ row }) => {
		const r = rows[row]!;
		if (aps) return { expected: r.p.acc, gap: 0 };
		let theta = main.theta;
		if (main.used[row]) {
			const unit = new Float64Array(n);
			for (const [k, f] of r.x) unit[k] = f;
			const z = solveWith(main.l, n, unit);
			let h = 0;
			for (const [k, f] of r.x) h += f * z[k]!;
			h *= r.p.w;
			const e = (r.p.capped ? CAP_Y : r.p.y) - predict(r, main.theta);
			const step = (r.p.w * e) / Math.max(1 - h, 1e-9);
			theta = main.theta.map((v, i) => v - z[i]! * step);
		}
		const rest = rows.filter((_, i) => i !== row);
		const g = curveAt(r, theta) + shiftOf(rest, theta, knots);
		return {
			expected: accOfNines(curveAt(r, theta) + tagPart(r, theta, knots)),
			gap: r.p.capped ? Math.max(0, CAP_Y - g) : r.p.y - g,
		};
	});
	const third = Math.floor(voted.length / 3);
	const group = new Map<number, ChartGroup>();
	voted
		.map((v, i) => ({ i, d: aps ? start[v.row]! : own[i]!.gap }))
		.sort((a, b) => a.d - b.d)
		.forEach(({ i }, k) => {
			group.set(
				i,
				k < third ? "worst" : k >= voted.length - third ? "best" : "middle",
			);
		});
	const charts: PooledChart[] = voted.map((v, i) => {
		const row = rows[v.row]!;
		return {
			...row.p.r,
			acc: row.p.acc,
			weight: row.p.w,
			expected: own[i]!.expected,
			diff: own[i]!.gap,
			group: group.get(i) ?? "middle",
			votes: v.total,
		};
	});
	const byTag = new Map<number, Acc>();
	const byCat = new Map<number, Acc>();
	voted.forEach(({ tags, total }, i) => {
		const pc = charts[i]!;
		const perCat = new Map<number, number>();
		for (const [tag, v] of tags) {
			for (const p of votes.tags.get(tag)?.parents ?? [])
				perCat.set(p, (perCat.get(p) ?? 0) + v);
			const share = v / total;
			if (share < PROFILE.minShare) continue;
			add(byTag, tag, i, share, v, pc);
		}
		let catTotal = 0;
		for (const v of perCat.values()) catTotal += v;
		for (const [cat, v] of perCat) add(byCat, cat, i, v / catTotal, v, pc);
	});
	const tagRows: ProfileTagRow[] = [...byTag]
		.map(([id, a]) => {
			const index = tagIndex.get(id);
			const score = scoreOf(
				votes.tags.get(id)?.name ?? String(id),
				a,
				index == null ? 0 : betas[index]!,
				index == null ? 0 : holds[index]!,
				aps,
			);
			return { ...score, side: sideOf(score) };
		})
		.sort((a, b) => b.diff - a.diff || a.name.localeCompare(b.name));
	const strip = ({ side: _s, ...tag }: ProfileTagRow): ProfileTagScore => tag;
	const listed = (side: TagRow["side"]) =>
		tagRows
			.filter((t) => t.side === side)
			.sort(
				(a, b) =>
					Number(a.faint) - Number(b.faint) ||
					Number(b.firm) - Number(a.firm) ||
					Math.abs(b.diff) - Math.abs(a.diff),
			)
			.slice(0, PROFILE.listMax)
			.map(strip);
	const strong = listed("strong");
	const weak = listed("weak");
	const categories: ProfileCategory[] = votes.categories.map((cat) => {
		const a = aps ? undefined : byCat.get(cat.id);
		const score: ProfileTagScore = a
			? scoreOf(cat.name, a, undefined, 1, false)
			: {
					name: cat.name,
					diff: 0,
					mean: 0,
					hold: 0,
					firm: false,
					faint: true,
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
			tags: tagRows,
			insufficient: voted.length < PROFILE.minCharts,
			basis: aps ? "aps" : "scores",
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

export type ScoreHistoryRow = readonly [
	acc: unknown,
	score: unknown,
	date: unknown,
	fc?: unknown,
];

export type ScoreHistoryRows = Readonly<
	Record<
		string,
		Partial<Record<string, readonly ScoreHistoryRow[]>> | undefined
	>
>;

function timeOf(v: unknown): number {
	if (v instanceof Date) return v.getTime();
	if (typeof v === "string" || typeof v === "number")
		return new Date(v).getTime();
	return Number.NaN;
}

type Point = { t: number; acc: number; score: number };

export function pastRecords(
	history: ScoreHistoryRows,
	constantOf: (id: string, level: string) => number | undefined,
): { records: ProfileRecord[]; t: number } | undefined {
	const series: { id: string; level: string; c: number; points: Point[] }[] =
		[];
	const times = new Set<number>();
	for (const [id, levels] of Object.entries(history)) {
		for (const [level, rows] of Object.entries(levels ?? {})) {
			if (!LEVELS.has(level)) continue;
			const c = constantOf(id, level);
			if (!c || !(c > 0)) continue;
			const points: Point[] = [];
			for (const row of rows ?? []) {
				const t = timeOf(row[2]);
				const acc = Number(row[0]);
				const score = Number(row[1]);
				if (!Number.isFinite(t) || !Number.isFinite(acc)) continue;
				if (!(score > 0)) continue;
				points.push({ t, acc, score });
				times.add(t);
			}
			if (!points.length) continue;
			points.sort((a, b) => a.t - b.t);
			series.push({ id, level, c, points });
		}
	}
	const order = [...times].sort((a, b) => b - a);
	for (const cutoff of order) {
		const records: ProfileRecord[] = [];
		for (const s of series) {
			let last: Point | undefined;
			for (const p of s.points) {
				if (p.t > cutoff) break;
				last = p;
			}
			if (!last) continue;
			const acc = Number(last.acc.toFixed(4));
			records.push({
				id: s.id,
				level: s.level,
				difficulty: s.c,
				rks: fCompute.rks(acc, s.c),
				acc,
			});
		}
		const built = poolOf(records);
		if (built && built.free >= PROFILE.minFree) return { records, t: cutoff };
	}
	return undefined;
}

export function historyProfileDetail(
	history: ScoreHistoryRows,
	constantOf: (id: string, level: string) => number | undefined,
	votes: TagVotes,
): ProfileDetail | undefined {
	const past = pastRecords(history, constantOf);
	if (!past) return undefined;
	const detail = tagProfileDetail(past.records, votes);
	if (detail.analysis.basis !== "scores" || detail.analysis.insufficient)
		return undefined;
	return {
		...detail,
		analysis: {
			...detail.analysis,
			basis: "history",
			asOf: new Date(past.t).toISOString(),
		},
	};
}
