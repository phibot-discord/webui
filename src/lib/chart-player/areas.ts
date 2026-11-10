import { ASPECT, lastAtOrBefore } from "./base";

const AREA_FADE = 0.5;
export const AREA_STRIDE = 12;
export const DISABLED_LEVEL = 0.55;

const SLICE = 1;
const SAMPLES = 100;

export type Areas = {
	count: number;
	peak: number;
	appear: Float64Array;
	enable: Float64Array;
	disable: Float64Array;
	disappear: Float64Array;
	sub: Uint8Array;
	cx: Float32Array;
	cy: Float32Array;
	w: Float32Array;
	h: Float32Array;
	moveOff: Int32Array;
	mt: Float64Array;
	mx: Float32Array;
	my: Float32Array;
	mex: Uint8Array;
	mey: Uint8Array;
	scaleOff: Int32Array;
	st: Float64Array;
	sax: Float32Array;
	say: Float32Array;
	ssx: Float32Array;
	ssy: Float32Array;
	sex: Uint8Array;
	sey: Uint8Array;
	rotOff: Int32Array;
	rt: Float64Array;
	rax: Float32Array;
	ray: Float32Array;
	rv: Float32Array;
	re: Uint8Array;
	sliceOff: Int32Array;
	sliceIds: Int32Array;
};

type Raw = Record<string, unknown>;

function rawEase(n: number, t: number): number {
	if (n === 13) return 0;
	if (n === 14) return 1;
	if (n >= 1 && n <= 12) {
		const e = Math.floor((n - 1) / 3) + 2;
		const kind = (n - 1) % 3;
		if (kind === 0) return t ** e;
		if (kind === 1) return 1 - (1 - t) ** e;
		return t < 0.5 ? (2 * t) ** e / 2 : 1 - (2 - 2 * t) ** e / 2;
	}
	return t;
}

const TABLES = Array.from({ length: 15 }, (_, n) =>
	Float32Array.from({ length: SAMPLES + 1 }, (_, i) => rawEase(n, i / SAMPLES)),
);

export function ease(n: number, t: number): number {
	const tab = TABLES[n] ?? TABLES[0]!;
	const p = Math.min(Math.max(t, 0), 1) * SAMPLES;
	const i = Math.floor(p);
	if (i >= SAMPLES) return tab[SAMPLES]!;
	const a = tab[i]!;
	return a + (tab[i + 1]! - a) * (p - i);
}

function ratio(t: number, a: number, b: number): number {
	if (b <= a) return 1;
	return Math.min(Math.max((t - a) / (b - a), 0), 1);
}

function num(v: unknown): number {
	return typeof v === "number" ? v : Number(v);
}

function point(v: unknown): [number, number] {
	const p = (v && typeof v === "object" ? v : {}) as Raw;
	return [num(p.x), num(p.y)];
}

const toX = (px: number) => (px - 0.5) * 2;
const toY = (py: number) => ((py - 0.5) * 2) / ASPECT;

function events(v: unknown): Raw[] {
	return Array.isArray(v)
		? v
				.filter((e): e is Raw => !!e && typeof e === "object")
				.map((e, i) => ({ e, i, t: num(e.time) }))
				.sort((a, b) => a.t - b.t || a.i - b.i)
				.map((x) => x.e)
		: [];
}

const easeOk = (v: unknown) => {
	const n = v === undefined ? 0 : num(v);
	return Number.isInteger(n) && n >= 0 && n <= 14;
};

function finite(...v: number[]): boolean {
	return v.every(Number.isFinite);
}

export function compileAreas(input: unknown): Areas {
	const list = Array.isArray(input)
		? input.filter((a): a is Raw => !!a && typeof a === "object")
		: [];
	const kept: {
		times: [number, number, number, number];
		sub: boolean;
		lo: [number, number];
		hi: [number, number];
		move: Raw[];
		scale: Raw[];
		rot: Raw[];
	}[] = [];
	for (const a of list) {
		const lo = point(a.bottomLeftPercentage);
		const hi = point(a.topRightPercentage);
		const appear = num(a.appearTime);
		const enable = Math.max(num(a.enableTime), appear);
		const disable = Math.max(num(a.disableTime), enable);
		const disappear = Math.max(num(a.disappearTime), disable);
		if (!finite(appear, enable, disable, disappear, ...lo, ...hi)) continue;
		const move = events(a.moveEvents);
		const scale = events(a.scaleEvents);
		const rot = events(a.rotateEvents);
		const ok =
			move.every(
				(e) =>
					finite(num(e.time), ...point(e.endPosition)) &&
					easeOk(e.easeTypeX) &&
					easeOk(e.easeTypeY),
			) &&
			scale.every(
				(e) =>
					finite(num(e.time), ...point(e.anchor), ...point(e.scale)) &&
					easeOk(e.easeTypeX) &&
					easeOk(e.easeTypeY),
			) &&
			rot.every(
				(e) =>
					finite(num(e.time), num(e.rotation), ...point(e.anchor)) &&
					easeOk(e.easeType),
			);
		if (!ok) continue;
		kept.push({
			times: [appear, enable, disable, disappear],
			sub: a.isSubtract === true,
			lo,
			hi,
			move,
			scale,
			rot,
		});
	}
	const n = kept.length;
	const flat = (key: "move" | "scale" | "rot") => {
		const off = new Int32Array(n + 1);
		kept.forEach((a, i) => {
			off[i + 1] = off[i]! + a[key].length;
		});
		return off;
	};
	const moveOff = flat("move");
	const scaleOff = flat("scale");
	const rotOff = flat("rot");
	const nm = moveOff[n]!;
	const ns = scaleOff[n]!;
	const nr = rotOff[n]!;
	const out: Areas = {
		count: n,
		peak: 0,
		appear: new Float64Array(n),
		enable: new Float64Array(n),
		disable: new Float64Array(n),
		disappear: new Float64Array(n),
		sub: new Uint8Array(n),
		cx: new Float32Array(n),
		cy: new Float32Array(n),
		w: new Float32Array(n),
		h: new Float32Array(n),
		moveOff,
		mt: new Float64Array(nm),
		mx: new Float32Array(nm),
		my: new Float32Array(nm),
		mex: new Uint8Array(nm),
		mey: new Uint8Array(nm),
		scaleOff,
		st: new Float64Array(ns),
		sax: new Float32Array(ns),
		say: new Float32Array(ns),
		ssx: new Float32Array(ns),
		ssy: new Float32Array(ns),
		sex: new Uint8Array(ns),
		sey: new Uint8Array(ns),
		rotOff,
		rt: new Float64Array(nr),
		rax: new Float32Array(nr),
		ray: new Float32Array(nr),
		rv: new Float32Array(nr),
		re: new Uint8Array(nr),
		sliceOff: new Int32Array(1),
		sliceIds: new Int32Array(0),
	};
	let last = 0;
	kept.forEach((a, i) => {
		const [appear, enable, disable, disappear] = a.times;
		out.appear[i] = appear;
		out.enable[i] = enable;
		out.disable[i] = disable;
		out.disappear[i] = disappear;
		out.sub[i] = a.sub ? 1 : 0;
		const x0 = toX(a.lo[0]);
		const y0 = toY(a.lo[1]);
		const x1 = toX(a.hi[0]);
		const y1 = toY(a.hi[1]);
		out.cx[i] = (x0 + x1) / 2;
		out.cy[i] = (y0 + y1) / 2;
		out.w[i] = x1 - x0;
		out.h[i] = y1 - y0;
		a.move.forEach((e, k) => {
			const j = moveOff[i]! + k;
			const [px, py] = point(e.endPosition);
			out.mt[j] = num(e.time);
			out.mx[j] = toX(px);
			out.my[j] = toY(py);
			out.mex[j] = num(e.easeTypeX ?? 0);
			out.mey[j] = num(e.easeTypeY ?? 0);
		});
		a.scale.forEach((e, k) => {
			const j = scaleOff[i]! + k;
			const [ax, ay] = point(e.anchor);
			const [sx, sy] = point(e.scale);
			out.st[j] = num(e.time);
			out.sax[j] = toX(ax);
			out.say[j] = toY(ay);
			out.ssx[j] = sx;
			out.ssy[j] = sy;
			out.sex[j] = num(e.easeTypeX ?? 0);
			out.sey[j] = num(e.easeTypeY ?? 0);
		});
		a.rot.forEach((e, k) => {
			const j = rotOff[i]! + k;
			const [ax, ay] = point(e.anchor);
			out.rt[j] = num(e.time);
			out.rax[j] = toX(ax);
			out.ray[j] = toY(ay);
			out.rv[j] = (num(e.rotation) * Math.PI) / 180;
			out.re[j] = num(e.easeType ?? 0);
		});
		last = Math.max(last, disappear);
	});
	const slices = n ? Math.max(1, Math.ceil(last / SLICE) + 1) : 0;
	const counts = new Int32Array(slices + 1);
	const span = (i: number): [number, number] => [
		Math.min(slices - 1, Math.max(0, Math.floor(out.appear[i]! / SLICE))),
		Math.min(slices - 1, Math.max(0, Math.floor(out.disappear[i]! / SLICE))),
	];
	for (let i = 0; i < n; i++) {
		const [a, b] = span(i);
		for (let s = a; s <= b; s++) counts[s + 1]!++;
	}
	for (let s = 0; s < slices; s++) counts[s + 1]! += counts[s]!;
	const ids = new Int32Array(counts[slices] ?? 0);
	const fill = counts.slice(0, slices);
	for (let i = 0; i < n; i++) {
		const [a, b] = span(i);
		for (let s = a; s <= b; s++) ids[fill[s]!++] = i;
	}
	out.sliceOff = counts;
	out.sliceIds = ids;
	const edges: [number, number][] = [];
	for (let i = 0; i < n; i++) {
		if (out.disappear[i]! > out.appear[i]!) {
			edges.push([out.appear[i]!, 1], [out.disappear[i]!, -1]);
		}
	}
	edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	let live = 0;
	for (const [, d] of edges) {
		live += d;
		out.peak = Math.max(out.peak, live);
	}
	return out;
}

export type Pose = {
	x: number;
	y: number;
	hx: number;
	hy: number;
	angle: number;
};

export function areaPose(a: Areas, i: number, t: number, out: Pose): Pose {
	const bx = a.cx[i]!;
	const by = a.cy[i]!;
	let x = bx;
	let y = by;
	let sx = 1;
	let sy = 1;
	const s0 = a.scaleOff[i]!;
	const s1 = a.scaleOff[i + 1]!;
	if (s1 > s0) {
		sx = a.ssx[s0]!;
		sy = a.ssy[s0]!;
		for (let k = s0; k + 1 < s1; k++) {
			const done = t >= a.st[k + 1]!;
			const p = ratio(t, a.st[k]!, a.st[k + 1]!);
			const fx = done ? 1 : ease(a.sex[k]!, p);
			const fy = done ? 1 : ease(a.sey[k]!, p);
			const ex = a.ssx[k]!;
			const ey = a.ssy[k]!;
			const vx = ex + (a.ssx[k + 1]! - ex) * fx;
			const vy = ey + (a.ssy[k + 1]! - ey) * fy;
			const ax = a.sax[k]!;
			const ay = a.say[k]!;
			x = ax + (x - ax) * (Math.abs(ex) < 1e-12 ? 1 : vx / ex);
			y = ay + (y - ay) * (Math.abs(ey) < 1e-12 ? 1 : vy / ey);
			sx = vx;
			sy = vy;
			if (!done) break;
		}
	}
	let angle = 0;
	const r0 = a.rotOff[i]!;
	const r1 = a.rotOff[i + 1]!;
	if (r1 > r0) {
		angle = a.rv[r0]!;
		for (let k = r0; k + 1 < r1; k++) {
			const done = t >= a.rt[k + 1]!;
			const e = a.rv[k]!;
			const v =
				e +
				(a.rv[k + 1]! - e) *
					(done ? 1 : ease(a.re[k]!, ratio(t, a.rt[k]!, a.rt[k + 1]!)));
			const d = v - e;
			if (d !== 0) {
				const c = Math.cos(d);
				const s = Math.sin(d);
				const ox = x - a.rax[k]!;
				const oy = y - a.ray[k]!;
				x = a.rax[k]! + c * ox - s * oy;
				y = a.ray[k]! + s * ox + c * oy;
			}
			angle = v;
			if (!done) break;
		}
	}
	const m0 = a.moveOff[i]!;
	const m1 = a.moveOff[i + 1]!;
	if (m1 > m0) {
		let vx = a.mx[m0]!;
		let vy = a.my[m0]!;
		if (m1 - m0 > 1) {
			const k = lastAtOrBefore(a.mt, m0 + 1, m1, t);
			if (k >= m1 - 1) {
				vx = a.mx[m1 - 1]!;
				vy = a.my[m1 - 1]!;
			} else {
				const p = ratio(t, a.mt[k]!, a.mt[k + 1]!);
				vx = a.mx[k]! + (a.mx[k + 1]! - a.mx[k]!) * ease(a.mex[k]!, p);
				vy = a.my[k]! + (a.my[k + 1]! - a.my[k]!) * ease(a.mey[k]!, p);
			}
		}
		x += vx - bx;
		y += vy - by;
	}
	out.x = x;
	out.y = y;
	out.hx = Math.abs(a.w[i]! * sx) / 2;
	out.hy = Math.abs(a.h[i]! * sy) / 2;
	out.angle = angle;
	return out;
}

export function areaLevel(a: Areas, i: number, t: number): number {
	const enable = a.enable[i]!;
	if (t >= enable && t < a.disable[i]!) return 2;
	const appear = a.appear[i]!;
	if (appear < enable && t >= enable - AREA_FADE && t < enable) return 1;
	if (t < enable && appear < enable) {
		return Math.min(Math.max((t - appear) / AREA_FADE, 0), 1) * DISABLED_LEVEL;
	}
	return DISABLED_LEVEL;
}

export type AreaCounts = {
	normal: number;
	activeSub: number;
	idleSub: number;
	total: number;
};

export class AreaBuilder {
	readonly data: Float32Array;
	readonly counts: AreaCounts = {
		normal: 0,
		activeSub: 0,
		idleSub: 0,
		total: 0,
	};
	private readonly ids: Int32Array;
	private readonly levels: Float32Array;
	private readonly pose: Pose = { x: 0, y: 0, hx: 0, hy: 0, angle: 0 };
	private n = 0;

	private put(
		i: number,
		t: number,
		r: number,
		g: number,
		b: number,
		w: number,
	) {
		const p = areaPose(this.areas, i, t, this.pose);
		const o = this.n * AREA_STRIDE;
		const d = this.data;
		d[o] = 0;
		d[o + 1] = p.x;
		d[o + 2] = p.y;
		d[o + 3] = Math.cos(p.angle);
		d[o + 4] = Math.sin(p.angle);
		d[o + 5] = p.hx;
		d[o + 6] = p.hy;
		d[o + 7] = 1;
		d[o + 8] = r;
		d[o + 9] = g;
		d[o + 10] = b;
		d[o + 11] = w;
		this.n++;
	}

	constructor(private readonly areas: Areas) {
		this.data = new Float32Array(Math.max(1, areas.peak) * AREA_STRIDE);
		this.ids = new Int32Array(Math.max(1, areas.peak) * 3);
		this.levels = new Float32Array(Math.max(1, areas.peak));
	}

	build(t: number): number {
		const a = this.areas;
		const c = this.counts;
		c.normal = 0;
		c.activeSub = 0;
		c.idleSub = 0;
		c.total = 0;
		if (!a.count) return 0;
		const slices = a.sliceOff.length - 1;
		const s = Math.min(slices - 1, Math.max(0, Math.floor(t / SLICE)));
		const from = a.sliceOff[s]!;
		const to = a.sliceOff[s + 1]!;
		const cap = this.levels.length;
		const ids = this.ids;
		let normal = 0;
		let activeSub = 0;
		let idleSub = 0;
		for (let j = from; j < to; j++) {
			const i = a.sliceIds[j]!;
			if (t < a.appear[i]! || t >= a.disappear[i]!) continue;
			const level = areaLevel(a, i, t);
			if (!a.sub[i]) {
				this.levels[normal] = level;
				ids[normal++] = i;
			} else if (level === 2) {
				ids[cap + activeSub++] = i;
			} else {
				ids[cap * 2 + idleSub++] = i;
			}
		}
		this.n = 0;
		for (let k = 0; k < normal; k++) {
			const level = this.levels[k]!;
			this.put(ids[k]!, t, level === 2 ? 1 : 0, 0, level === 2 ? 0 : level, 0);
		}
		for (let k = 0; k < activeSub; k++) this.put(ids[cap + k]!, t, 0, 1, 0, 0);
		for (let k = 0; k < idleSub; k++)
			this.put(ids[cap * 2 + k]!, t, 0, 0, 0, 1);
		const n = this.n;
		c.normal = normal;
		c.activeSub = activeSub;
		c.idleSub = idleSub;
		c.total = n;
		return n;
	}
}
