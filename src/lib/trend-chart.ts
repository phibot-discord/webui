export type TrendRange = "m1" | "m3" | "y1" | "all";
export const TREND_RANGES: TrendRange[] = ["m1", "m3", "y1", "all"];

const DAY = 86_400_000;
const SPAN: Record<Exclude<TrendRange, "all">, number> = {
	m1: 31 * DAY,
	m3: 92 * DAY,
	y1: 366 * DAY,
};

export function inRange<T extends readonly [number, number]>(
	points: readonly T[],
	range: TrendRange,
): T[] {
	if (range === "all" || !points.length) return [...points];
	const end = points.at(-1)?.[0] ?? 0;
	const from = end - SPAN[range];
	const inside = points.filter(([t]) => t >= from);
	const before = points.filter(([t]) => t < from).at(-1);
	return before ? [before, ...inside] : inside;
}

export function defaultRange(points: readonly (readonly [number, number])[]) {
	if (points.length < 2) return "all";
	const span = (points.at(-1)?.[0] ?? 0) - (points[0]?.[0] ?? 0);
	return span > SPAN.y1 ? "y1" : "all";
}

export function niceStep(span: number, count: number): number {
	if (!(span > 0)) return 0.01;
	const raw = span / count;
	const pow = 10 ** Math.floor(Math.log10(raw));
	const unit = raw / pow;
	const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
	return nice * pow;
}

export function valueTicks(lo: number, hi: number, count = 4) {
	const pad = Math.max((hi - lo) * 0.08, 0.005);
	const step = niceStep(hi - lo + pad * 2, count);
	const start = Math.floor((lo - pad) / step) * step;
	const end = Math.ceil((hi + pad) / step) * step;
	const ticks: number[] = [];
	for (let v = start; v <= end + step / 2; v += step) {
		ticks.push(Number(v.toFixed(6)));
	}
	return { min: start, max: end, ticks };
}

export function timeTicks(from: number, to: number, count = 4): number[] {
	if (!(to > from)) return [from];
	const out: number[] = [];
	for (let i = 0; i <= count; i++) out.push(from + ((to - from) * i) / count);
	return out;
}

export function nearestIndex(xs: readonly number[], x: number): number {
	if (!xs.length) return -1;
	let lo = 0;
	let hi = xs.length - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if ((xs[mid] ?? 0) <= x) lo = mid;
		else hi = mid;
	}
	return Math.abs((xs[lo] ?? 0) - x) <= Math.abs((xs[hi] ?? 0) - x) ? lo : hi;
}

export function signedDelta(n: number, places = 4): string {
	const abs = Math.abs(n);
	if (abs < 0.5 * 10 ** -places) return (0).toFixed(places);
	return `${n > 0 ? "+" : "−"}${abs.toFixed(places)}`;
}
