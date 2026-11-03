import {
	ASPECT,
	BELOW,
	type CompiledChart,
	DRAG,
	FLICK,
	FLOOR_UNIT,
	FX_LIFE,
	firstAfter,
	firstAtOrAfter,
	floorAt,
	HOLD,
	MULTI,
	segValue,
	TAP,
} from "./chart";

export const STRIDE = 12;

export const K_LINE = 0;
export const K_HOLD = 1;
export const K_DRAG = 2;
export const K_TAP = 3;
export const K_FLICK = 4;
export const K_RING = 5;
export const K_SPARK = 6;

export const NOTE_HW = 0.118;
export const TAP_HH = 0.0135;
export const DRAG_HH = 0.0085;
export const HOLD_CAP = 0.004;
export const LINE_HALF = 6;
export const LINE_HH = 0.0038;
export const RING_HALF = 0.11;
export const SPARK_HALF = 0.0105;
export const NOTE_SCALE_MIN = 0.6;
export const NOTE_SCALE_MAX = 1.5;

const SPARKS = 4;
const HIDE_BELOW = -0.001;
const X_LIM = 1 + 0.25;
const Y_LIM = 1 / ASPECT + 0.25;
const REACH_PAD = 0.06;
// Holds (bodies, then heads) go under every other note, so a drag, tap or flick on a hold stays visible
const PASSES = [
	{ kind: HOLD, out: K_HOLD, head: false },
	{ kind: HOLD, out: K_HOLD, head: true },
	{ kind: DRAG, out: K_DRAG, head: false },
	{ kind: TAP, out: K_TAP, head: false },
	{ kind: FLICK, out: K_FLICK, head: false },
];

export type FrameStats = { lines: number; notes: number; fx: number };

function hash(n: number): number {
	let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
}

export class FrameBuilder {
	readonly data: Float32Array;
	readonly stats: FrameStats = { lines: 0, notes: 0, fx: 0 };
	chordColors = false;
	noteScale = 1;
	private readonly lx: Float64Array;
	private readonly ly: Float64Array;
	private readonly lc: Float64Array;
	private readonly ls: Float64Array;
	private readonly la: Float64Array;
	private readonly lf: Float64Array;
	private readonly ld: Float64Array;
	private readonly off: Int32Array;
	private readonly ids: Int32Array;
	private readonly times: Float64Array;
	// A line whose floor never runs backwards lets the walk stop at the first note beyond the screen
	private readonly fast: Uint8Array;
	private readonly minSpeed: Float32Array;
	private readonly maxHold: Float64Array;
	private n = 0;

	constructor(private readonly chart: CompiledChart) {
		const { lines, notes } = chart;
		const n = notes.time.length;
		const cap =
			lines + n + chart.counts.hold + chart.fx.peak * (1 + SPARKS) + 1;
		this.data = new Float32Array(cap * STRIDE);
		this.lx = new Float64Array(lines);
		this.ly = new Float64Array(lines);
		this.lc = new Float64Array(lines);
		this.ls = new Float64Array(lines);
		this.la = new Float64Array(lines);
		this.lf = new Float64Array(lines);
		this.ld = new Float64Array(lines);
		const off = new Int32Array(lines * 4 + 1);
		for (let i = 0; i < n; i++) {
			const k = notes.line[i]! * 4 + notes.kind[i]! + 1;
			off[k] = off[k]! + 1;
		}
		for (let k = 0; k < lines * 4; k++) off[k + 1]! += off[k]!;
		const fill = off.slice(0, lines * 4);
		const ids = new Int32Array(n);
		const times = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			const k = notes.line[i]! * 4 + notes.kind[i]!;
			const at = fill[k]!;
			fill[k] = at + 1;
			ids[at] = i;
			times[at] = notes.time[i]!;
		}
		const fast = new Uint8Array(lines).fill(1);
		const minSpeed = new Float32Array(lines).fill(Number.POSITIVE_INFINITY);
		const maxHold = new Float64Array(lines);
		const sp = chart.speed;
		for (let li = 0; li < lines; li++) {
			for (let j = sp.off[li]!; j < sp.off[li + 1]!; j++) {
				if (sp.v[j]! < 0) fast[li] = 0;
			}
		}
		for (let i = 0; i < n; i++) {
			const li = notes.line[i]!;
			const speed = notes.speed[i]!;
			const hold = notes.kind[i] === HOLD;
			if (!(speed > 0) || (hold && notes.tail[i]! < notes.floor[i]!)) {
				fast[li] = 0;
			} else if (speed < minSpeed[li]!) {
				minSpeed[li] = speed;
			}
			if (hold) {
				maxHold[li] = Math.max(maxHold[li]!, notes.end[i]! - notes.time[i]!);
			}
		}
		for (let li = 0; li < lines; li++) {
			if (!Number.isFinite(minSpeed[li])) minSpeed[li] = 1;
		}
		this.off = off;
		this.ids = ids;
		this.times = times;
		this.fast = fast;
		this.minSpeed = minSpeed;
		this.maxHold = maxHold;
	}

	private put(
		kind: number,
		x: number,
		y: number,
		c: number,
		s: number,
		hx: number,
		hy: number,
		alpha: number,
		p0: number,
		p1: number,
		p2: number,
		p3: number,
	) {
		const d = this.data;
		const o = this.n * STRIDE;
		d[o] = kind;
		d[o + 1] = x;
		d[o + 2] = y;
		d[o + 3] = c;
		d[o + 4] = s;
		d[o + 5] = hx;
		d[o + 6] = hy;
		d[o + 7] = alpha;
		d[o + 8] = p0;
		d[o + 9] = p1;
		d[o + 10] = p2;
		d[o + 11] = p3;
		this.n++;
	}

	build(t: number): number {
		const { chart } = this;
		const { lx, ly, lc, ls, la, lf, ld } = this;
		this.n = 0;
		for (let i = 0; i < chart.lines; i++) {
			const x = segValue(chart.move, i, t, 0);
			const y = segValue(chart.move, i, t, 0, true);
			const r = segValue(chart.rotate, i, t, 0);
			const a = segValue(chart.alpha, i, t, 1);
			lx[i] = x;
			ly[i] = y;
			const c = Math.cos(r);
			const s = Math.sin(r);
			lc[i] = c;
			ls[i] = s;
			la[i] = a;
			lf[i] = floorAt(chart.speed, i, t);
			ld[i] = Math.hypot(X_LIM + Math.abs(x), Y_LIM + Math.abs(y));
			if (a > 0) {
				this.put(
					K_LINE,
					x,
					y,
					c,
					s,
					LINE_HALF,
					LINE_HH,
					Math.min(a, 1),
					0,
					0,
					0,
					0,
				);
			}
		}
		this.stats.lines = this.n;
		const notes = chart.notes;
		const { off, ids, times, fast, minSpeed, maxHold } = this;
		const scale = this.noteScale;
		const hw = NOTE_HW * scale;
		const headHH = TAP_HH * scale;
		for (const pass of PASSES) {
			const { kind, head } = pass;
			const hh = (kind === DRAG ? DRAG_HH : TAP_HH) * scale;
			for (let li = 0; li < chart.lines; li++) {
				if (la[li]! < 0) continue;
				const b = li * 4 + kind;
				const lo = off[b]!;
				const hi = off[b + 1]!;
				if (lo === hi) continue;
				const from =
					kind === HOLD && !head
						? firstAtOrAfter(times, t - maxHold[li]!, lo, hi)
						: firstAfter(times, t, lo, hi);
				if (from >= hi) continue;
				const c = lc[li]!;
				const s = ls[li]!;
				const ox = lx[li]!;
				const oy = ly[li]!;
				const lineFloor = lf[li]!;
				const reach = ld[li]! + REACH_PAD;
				const limit = fast[li]
					? kind === HOLD
						? reach
						: reach / minSpeed[li]!
					: Number.POSITIVE_INFINITY;
				for (let j = from; j < hi; j++) {
					const i = ids[j]!;
					const headAt = (notes.floor[i]! - lineFloor) * FLOOR_UNIT;
					if (headAt > limit) break;
					const flags = notes.flags[i]!;
					const sg = flags & BELOW ? -1 : 1;
					const multi = flags & MULTI ? 1 : 0;
					const glow = multi && this.chordColors ? 1 + notes.tint[i]! : multi;
					const xo = notes.x[i]!;
					if (kind !== HOLD || head) {
						const dy = head ? headAt : headAt * notes.speed[i]!;
						if (dy <= HIDE_BELOW) continue;
						const ly0 = sg * dy;
						const px = ox + c * xo - s * ly0;
						const py = oy + s * xo + c * ly0;
						if (px > X_LIM || px < -X_LIM || py > Y_LIM || py < -Y_LIM)
							continue;
						if (head) {
							this.put(K_HOLD, px, py, c, s, hw, sg * headHH, 1, glow, 1, 0, 0);
						} else {
							this.put(pass.out, px, py, c, s, hw, sg * hh, 1, glow, 0, 0, 0);
						}
						continue;
					}
					if (t >= notes.end[i]!) continue;
					const started = t >= notes.time[i]!;
					if (!started && headAt <= HIDE_BELOW) continue;
					const bottom = started ? 0 : headAt;
					const top = (notes.tail[i]! - lineFloor) * FLOOR_UNIT;
					const len = top - bottom;
					if (len <= 0) continue;
					const y1 = top + HOLD_CAP;
					const mid = (bottom + y1) / 2;
					const hhold = (y1 - bottom) / 2;
					const ly0 = sg * mid;
					const px = ox + c * xo - s * ly0;
					const py = oy + s * xo + c * ly0;
					const span = hhold + hw;
					if (
						px - span > X_LIM ||
						px + span < -X_LIM ||
						py - span > Y_LIM ||
						py + span < -Y_LIM
					) {
						continue;
					}
					this.put(
						K_HOLD,
						px,
						py,
						c,
						s,
						hw,
						sg * hhold,
						1,
						glow,
						0,
						bottom - mid,
						len,
					);
				}
			}
		}
		this.stats.notes = this.n - this.stats.lines;
		const fx = chart.fx;
		const a = firstAfter(fx.t, t - FX_LIFE);
		const b = firstAfter(fx.t, t);
		for (let j = a; j < b; j++) {
			const age = (t - fx.t[j]!) / FX_LIFE;
			const x = fx.x[j]!;
			const y = fx.y[j]!;
			this.put(K_RING, x, y, 1, 0, RING_HALF, RING_HALF, 1, age, 0, 0, 0);
			const out = 1 - (1 - age) * (1 - age);
			for (let k = 0; k < SPARKS; k++) {
				const seed = j * SPARKS + k;
				const ang = (k + hash(seed)) * ((Math.PI * 2) / SPARKS);
				const dist = (0.075 + 0.09 * hash(seed + 7919)) * out;
				const size =
					SPARK_HALF * (0.75 + 0.5 * hash(seed + 104729)) * (1 - 0.45 * age);
				this.put(
					K_SPARK,
					x + Math.cos(ang) * dist,
					y + Math.sin(ang) * dist,
					1,
					0,
					size,
					size,
					1 - age,
					age,
					0,
					0,
					0,
				);
			}
		}
		this.stats.fx = b - a;
		return this.n;
	}
}
