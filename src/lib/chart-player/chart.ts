import { type Areas, compileAreas } from "./areas";
import { ASPECT, lastAtOrBefore } from "./base";

export { ASPECT, firstAfter, firstAtOrAfter, lastAtOrBefore } from "./base";
export const FLOOR_UNIT = 1 / (0.83175 * ASPECT);
export const NOTE_X = 0.1125;
export const FX_LIFE = 0.5;
export const HOLD_FX_STEP = 0.15;

export const HOLD = 0;
export const DRAG = 1;
export const TAP = 2;
export const FLICK = 3;

export const BELOW = 1;
export const MULTI = 2;

export const CHORD_NEAR = 0.2;
export const CHORD_COLORS = 4;

export const SOUND_TAP = 0;
export const SOUND_DRAG = 1;
export const SOUND_FLICK = 2;

export type Segments = {
	off: Int32Array;
	t0: Float64Array;
	t1: Float64Array;
	a0: Float32Array;
	a1: Float32Array;
	b0: Float32Array;
	b1: Float32Array;
};

export type Speeds = {
	off: Int32Array;
	t: Float64Array;
	v: Float32Array;
	f: Float64Array;
};

export type Notes = {
	time: Float64Array;
	end: Float64Array;
	floor: Float64Array;
	tail: Float64Array;
	x: Float32Array;
	speed: Float32Array;
	line: Uint16Array;
	kind: Uint8Array;
	flags: Uint8Array;
	tint: Uint8Array;
	byKind: Int32Array[];
	kindTime: Float64Array[];
	maxHold: number;
};

export type Effects = {
	t: Float64Array;
	x: Float32Array;
	y: Float32Array;
	peak: number;
};

export type Hits = { t: Float64Array; sound: Uint8Array };

export type CompiledChart = {
	format: number;
	offset: number;
	lines: number;
	end: number;
	move: Segments;
	rotate: Segments;
	alpha: Segments;
	speed: Speeds;
	notes: Notes;
	fx: Effects;
	hits: Hits;
	areas: Areas;
	counts: { tap: number; drag: number; hold: number; flick: number };
};

type Raw = Record<string, unknown>;

const KINDS: Record<number, number> = { 1: TAP, 2: DRAG, 3: HOLD, 4: FLICK };

function num(v: unknown, fallback = 0): number {
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : fallback;
}

function list(v: unknown): Raw[] {
	return Array.isArray(v)
		? v.filter((x): x is Raw => !!x && typeof x === "object")
		: [];
}

export function segValue(
	s: Segments,
	line: number,
	t: number,
	fallback: number,
	second = false,
): number {
	const lo = s.off[line]!;
	const hi = s.off[line + 1]!;
	if (lo === hi) return fallback;
	const v0 = second ? s.b0 : s.a0;
	const v1 = second ? s.b1 : s.a1;
	const i = lastAtOrBefore(s.t0, lo, hi, t);
	if (i < lo) return v0[lo]!;
	const end = s.t1[i]!;
	const b = v1[i]!;
	if (t >= end) return b;
	const start = s.t0[i]!;
	const span = end - start;
	if (span <= 0) return b;
	const a = v0[i]!;
	return a + ((b - a) * (t - start)) / span;
}

export function floorAt(s: Speeds, line: number, t: number): number {
	const lo = s.off[line]!;
	const hi = s.off[line + 1]!;
	if (lo === hi) return t;
	const i = Math.max(lo, lastAtOrBefore(s.t, lo, hi, t));
	return s.f[i]! + (t - s.t[i]!) * s.v[i]!;
}

type Event = [number, number, number, number, number, number];

class SegBuilder {
	off: number[] = [0];
	rows: Event[] = [];
	add(events: Event[]) {
		const kept = events
			.filter((e) => e[0] <= e[1])
			.map((e, i) => ({ e, i }))
			.sort((a, b) => a.e[0] - b.e[0] || a.i - b.i);
		for (const { e } of kept) this.rows.push(e);
		this.off.push(this.rows.length);
	}
	build(): Segments {
		const n = this.rows.length;
		const s: Segments = {
			off: Int32Array.from(this.off),
			t0: new Float64Array(n),
			t1: new Float64Array(n),
			a0: new Float32Array(n),
			a1: new Float32Array(n),
			b0: new Float32Array(n),
			b1: new Float32Array(n),
		};
		this.rows.forEach((e, i) => {
			s.t0[i] = e[0];
			s.t1[i] = e[1];
			s.a0[i] = e[2];
			s.a1[i] = e[3];
			s.b0[i] = e[4];
			s.b1[i] = e[5];
		});
		return s;
	}
}

function timed(raw: Raw, r: number): [number, number] {
	return [
		Math.max(0, num(raw.startTime) * r),
		Math.max(0, num(raw.endTime) * r),
	];
}

function moveEvent(raw: Raw, r: number, format: number): Event {
	const [st, en] = timed(raw, r);
	if (format === 1) {
		const a = num(raw.start);
		const b = num(raw.end);
		const ax = (a - (a % 1000)) / 1000;
		const bx = (b - (b % 1000)) / 1000;
		return [
			st,
			en,
			(ax * 2 - 880) / 880,
			(bx * 2 - 880) / 880,
			((a % 1000) * 2 - 520) / 520 / ASPECT,
			((b % 1000) * 2 - 520) / 520 / ASPECT,
		];
	}
	return [
		st,
		en,
		num(raw.start) * 2 - 1,
		num(raw.end) * 2 - 1,
		(num(raw.start2) * 2 - 1) / ASPECT,
		(num(raw.end2) * 2 - 1) / ASPECT,
	];
}

function plainEvent(raw: Raw, r: number, scale: number): Event {
	const [st, en] = timed(raw, r);
	return [st, en, num(raw.start) * scale, num(raw.end) * scale, 0, 0];
}

type Pending = {
	line: number;
	order: number;
	time: number;
	end: number;
	floor: number;
	tail: number;
	x: number;
	speed: number;
	kind: number;
	below: boolean;
};

function speedsOf(
	raw: Raw[],
	r: number,
): { t: number[]; v: number[]; f: number[] } {
	const events = raw
		.map((e, i) => ({
			st: num(e.startTime) * r,
			en: num(e.endTime) * r,
			v: num(e.value),
			i,
		}))
		.filter((e) => e.st <= e.en)
		.sort((a, b) => a.st - b.st || a.i - b.i);
	const first = events[0];
	if (!first) return { t: [0], v: [1], f: [0] };
	first.st = 0;
	const t: number[] = [];
	const v: number[] = [];
	const f: number[] = [];
	let pos = 0;
	events.forEach((e, i) => {
		if (i) pos += (e.st - t[i - 1]!) * v[i - 1]!;
		t.push(e.st);
		v.push(e.v);
		f.push(pos);
	});
	return { t, v, f };
}

function timeKey(t: number): number {
	return Math.round(t * 1e6);
}

export function chordTints(sortedTimes: number[]): Uint8Array {
	const tint = new Uint8Array(sortedTimes.length);
	const groups: { t: number; from: number; to: number }[] = [];
	for (let i = 0; i < sortedTimes.length; ) {
		const k = timeKey(sortedTimes[i]!);
		let j = i + 1;
		while (j < sortedTimes.length && timeKey(sortedTimes[j]!) === k) j++;
		if (j - i > 1) groups.push({ t: sortedTimes[i]!, from: i, to: j });
		i = j;
	}
	const color = new Int8Array(groups.length);
	groups.forEach((g, gi) => {
		const prev = groups[gi - 1];
		const next = groups[gi + 1];
		const crowded =
			g.to - g.from > 2 ||
			(prev !== undefined && g.t - prev.t <= CHORD_NEAR) ||
			(next !== undefined && next.t - g.t <= CHORD_NEAR);
		if (!crowded) return;
		const used = new Set<number>();
		for (let k = gi - 1; k >= 0 && g.t - groups[k]!.t <= CHORD_NEAR; k--) {
			used.add(color[k]!);
		}
		let c = 1;
		while (used.has(c) && c < CHORD_COLORS) c++;
		color[gi] = c;
		for (let i = g.from; i < g.to; i++) tint[i] = c;
	});
	return tint;
}

export function compileChart(input: unknown): CompiledChart {
	if (!input || typeof input !== "object")
		throw new Error("chart: not an object");
	const root = input as Raw;
	const lines = list(root.judgeLineList);
	if (!lines.length) throw new Error("chart: no judge lines");
	const format = num(root.formatVersion, 3) === 1 ? 1 : 3;
	const move = new SegBuilder();
	const rotate = new SegBuilder();
	const alpha = new SegBuilder();
	const spOff = [0];
	const spT: number[] = [];
	const spV: number[] = [];
	const spF: number[] = [];
	const pending: Pending[] = [];
	lines.forEach((line, li) => {
		const bpm = num(line.bpm, 120);
		const r = 1.875 / (bpm > 0 ? bpm : 120);
		move.add(
			list(line.judgeLineMoveEvents).map((e) => moveEvent(e, r, format)),
		);
		rotate.add(
			list(line.judgeLineRotateEvents).map((e) =>
				plainEvent(e, r, Math.PI / 180),
			),
		);
		alpha.add(
			list(line.judgeLineDisappearEvents).map((e) => plainEvent(e, r, 1)),
		);
		const sp = speedsOf(list(line.speedEvents), r);
		spT.push(...sp.t);
		spV.push(...sp.v);
		spF.push(...sp.f);
		spOff.push(spT.length);
		const fastFloor = (t: number) => {
			let a = 0;
			let b = sp.t.length;
			while (a < b) {
				const m = (a + b) >> 1;
				if (sp.t[m]! <= t) a = m + 1;
				else b = m;
			}
			const i = Math.max(0, a - 1);
			return sp.f[i]! + (t - sp.t[i]!) * sp.v[i]!;
		};
		for (const below of [false, true]) {
			for (const raw of list(below ? line.notesBelow : line.notesAbove)) {
				const kind = KINDS[num(raw.type)];
				if (kind === undefined) continue;
				const time = num(raw.time) * r;
				const floor = fastFloor(time);
				const speed = num(raw.speed, 1);
				const hold = kind === HOLD ? Math.max(0, num(raw.holdTime) * r) : 0;
				pending.push({
					line: li,
					order: pending.length,
					time,
					end: time + hold,
					floor,
					tail: floor + hold * speed,
					x: num(raw.positionX) * NOTE_X,
					speed: kind === HOLD ? 1 : speed,
					kind,
					below,
				});
			}
		}
	});
	pending.sort((a, b) => a.time - b.time || a.order - b.order);
	const n = pending.length;
	const same = new Map<number, number>();
	for (const p of pending) {
		const k = timeKey(p.time);
		same.set(k, (same.get(k) ?? 0) + 1);
	}
	const notes: Notes = {
		time: new Float64Array(n),
		end: new Float64Array(n),
		floor: new Float64Array(n),
		tail: new Float64Array(n),
		x: new Float32Array(n),
		speed: new Float32Array(n),
		line: new Uint16Array(n),
		kind: new Uint8Array(n),
		flags: new Uint8Array(n),
		tint: chordTints(pending.map((p) => p.time)),
		byKind: [],
		kindTime: [],
		maxHold: 0,
	};
	const buckets: [number[], number[], number[], number[]] = [[], [], [], []];
	pending.forEach((p, i) => {
		notes.time[i] = p.time;
		notes.end[i] = p.end;
		notes.floor[i] = p.floor;
		notes.tail[i] = p.tail;
		notes.x[i] = p.x;
		notes.speed[i] = p.speed;
		notes.line[i] = p.line;
		notes.kind[i] = p.kind;
		notes.flags[i] =
			(p.below ? BELOW : 0) |
			((same.get(timeKey(p.time)) ?? 0) > 1 ? MULTI : 0);
		buckets[p.kind]!.push(i);
		if (p.kind === HOLD)
			notes.maxHold = Math.max(notes.maxHold, p.end - p.time);
	});
	notes.byKind = buckets.map((b) => Int32Array.from(b));
	notes.kindTime = buckets.map((b) =>
		Float64Array.from(b, (i) => notes.time[i]!),
	);

	const chart: CompiledChart = {
		format,
		offset: num(root.offset),
		lines: lines.length,
		end: pending.reduce((m, p) => Math.max(m, p.end), 0),
		move: move.build(),
		rotate: rotate.build(),
		alpha: alpha.build(),
		speed: {
			off: Int32Array.from(spOff),
			t: Float64Array.from(spT),
			v: Float32Array.from(spV),
			f: Float64Array.from(spF),
		},
		notes,
		fx: {
			t: new Float64Array(0),
			x: new Float32Array(0),
			y: new Float32Array(0),
			peak: 0,
		},
		hits: { t: new Float64Array(0), sound: new Uint8Array(0) },
		areas: compileAreas(root.blockAreaList),
		counts: {
			tap: buckets[TAP].length,
			drag: buckets[DRAG].length,
			hold: buckets[HOLD].length,
			flick: buckets[FLICK].length,
		},
	};
	chart.fx = effectsOf(chart);
	chart.hits = hitsOf(chart);
	return chart;
}

function effectsOf(chart: CompiledChart): Effects {
	const { notes } = chart;
	const at: { t: number; x: number; y: number }[] = [];
	const emit = (i: number, t: number) => {
		const li = notes.line[i]!;
		const lx = segValue(chart.move, li, t, 0);
		const ly = segValue(chart.move, li, t, 0, true);
		const rot = segValue(chart.rotate, li, t, 0);
		const x = notes.x[i]!;
		at.push({ t, x: lx + Math.cos(rot) * x, y: ly + Math.sin(rot) * x });
	};
	for (let i = 0; i < notes.time.length; i++) {
		const t = notes.time[i]!;
		if (notes.kind[i] !== HOLD) {
			emit(i, t);
			continue;
		}
		const end = notes.end[i]!;
		for (let k = 0; t + k * HOLD_FX_STEP < end; k++)
			emit(i, t + k * HOLD_FX_STEP);
		emit(i, end);
	}
	at.sort((a, b) => a.t - b.t);
	const t = Float64Array.from(at, (e) => e.t);
	let peak = 0;
	for (let a = 0, b = 0; b < t.length; b++) {
		while (t[b]! - t[a]! > FX_LIFE) a++;
		peak = Math.max(peak, b - a + 1);
	}
	return {
		t,
		x: Float32Array.from(at, (e) => e.x),
		y: Float32Array.from(at, (e) => e.y),
		peak,
	};
}

function hitsOf(chart: CompiledChart): Hits {
	const { notes } = chart;
	const seen = new Set<string>();
	const out: { t: number; s: number }[] = [];
	for (let i = 0; i < notes.time.length; i++) {
		const k = notes.kind[i];
		const s = k === DRAG ? SOUND_DRAG : k === FLICK ? SOUND_FLICK : SOUND_TAP;
		const time = notes.time[i]!;
		const key = `${timeKey(time)}:${s}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({ t: time, s });
	}
	return {
		t: Float64Array.from(out, (h) => h.t),
		sound: Uint8Array.from(out, (h) => h.s),
	};
}

export function transferables(chart: CompiledChart): ArrayBuffer[] {
	const out = new Set<ArrayBuffer>();
	const walk = (v: unknown) => {
		if (ArrayBuffer.isView(v)) {
			out.add(v.buffer as ArrayBuffer);
			return;
		}
		if (Array.isArray(v)) v.forEach(walk);
		else if (v && typeof v === "object") Object.values(v).forEach(walk);
	};
	walk(chart);
	return [...out];
}
