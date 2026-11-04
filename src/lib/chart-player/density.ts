import { lastAtOrBefore } from "./base";
import { type CompiledChart, DRAG, FLICK, HOLD, MULTI, TAP } from "./chart";

export type Density = { bins: Float32Array; peak: number };

export type Hardest = {
	start: number;
	score: number;
	count: number;
	noise: boolean;
};

export type Span = readonly [start: number, end: number];

const KIND_WEIGHT: Record<number, number> = {
	[TAP]: 1,
	[FLICK]: 1,
	[HOLD]: 1.1,
	[DRAG]: 0.4,
};
const CHORD = 1.25;
const SPEED_MIN = 0.7;
const SPEED_MAX = 1.8;
export const NOISE_BONUS = 0.35;

function lineSpeed(chart: CompiledChart, line: number, t: number): number {
	const { off, t: times, v } = chart.speed;
	const lo = off[line]!;
	const hi = off[line + 1]!;
	if (lo === hi) return 1;
	const i = Math.max(lo, lastAtOrBefore(times, lo, hi, t));
	return Math.abs(v[i]!);
}

function median(values: number[]): number {
	if (!values.length) return 1;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] || 1;
}

export function noteWeights(chart: CompiledChart): Float32Array {
	const { notes } = chart;
	const n = notes.time.length;
	const eff = new Array<number>(n);
	for (let i = 0; i < n; i++) {
		const own = notes.kind[i] === HOLD ? 1 : Math.abs(notes.speed[i]!);
		eff[i] = lineSpeed(chart, notes.line[i]!, notes.time[i]!) * own;
	}
	const mid = median(eff.filter((x) => x > 0));
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const speed = Math.min(
			SPEED_MAX,
			Math.max(SPEED_MIN, Math.sqrt((eff[i] ?? 0) / mid)),
		);
		const chord = notes.flags[i]! & MULTI ? CHORD : 1;
		out[i] = (KIND_WEIGHT[notes.kind[i]!] ?? 1) * chord * speed;
	}
	return out;
}

export function noiseSpans(chart: CompiledChart): Span[] {
	const { areas } = chart;
	const raw: [number, number][] = [];
	for (let i = 0; i < areas.count; i++) {
		const a = areas.enable[i]!;
		const b = areas.disable[i]!;
		if (b > a) raw.push([a, b]);
	}
	raw.sort((x, y) => x[0] - y[0]);
	const out: [number, number][] = [];
	for (const [a, b] of raw) {
		const last = out.at(-1);
		if (last && a <= last[1]) last[1] = Math.max(last[1], b);
		else out.push([a, b]);
	}
	return out;
}

function overlap(spans: readonly Span[], a: number, b: number): number {
	let sum = 0;
	for (const [s, e] of spans) {
		if (s >= b) break;
		if (e <= a) continue;
		sum += Math.min(e, b) - Math.max(s, a);
	}
	return sum;
}

export function densityOf(
	times: ArrayLike<number>,
	offset: number,
	duration: number,
	bins: number,
	weights?: ArrayLike<number>,
): Density {
	const out = new Float32Array(Math.max(1, bins));
	if (!(duration > 0)) return { bins: out, peak: 0 };
	const n = out.length;
	for (let i = 0; i < times.length; i++) {
		const at = (times[i] ?? 0) + offset;
		if (at < 0 || at > duration) continue;
		out[Math.min(n - 1, Math.floor((at / duration) * n))]! += weights
			? (weights[i] ?? 1)
			: 1;
	}
	let peak = 0;
	for (let i = 0; i < n; i++) peak = Math.max(peak, out[i]!);
	return { bins: out, peak };
}

export function hardestWindow(
	times: ArrayLike<number>,
	weights: ArrayLike<number>,
	spans: readonly Span[],
	offset: number,
	window: number,
): Hardest | null {
	if (!times.length || !(window > 0)) return null;
	let best: Hardest | null = null;
	let hi = 0;
	let sum = 0;
	for (let lo = 0; lo < times.length; lo++) {
		const start = times[lo] ?? 0;
		while (hi < times.length && (times[hi] ?? 0) < start + window) {
			sum += weights[hi] ?? 1;
			hi++;
		}
		const noisy = overlap(spans, start, start + window) / window;
		const score = sum * (1 + NOISE_BONUS * noisy);
		if (!best || score > best.score)
			best = { start: start + offset, score, count: hi - lo, noise: noisy > 0 };
		sum -= weights[lo] ?? 1;
	}
	return best;
}
