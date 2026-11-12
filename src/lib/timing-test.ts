export const STEADY_BEATS = 32;
export const COUNT_IN = 4;
export const BPM_CHOICES = [90, 120, 150, 180] as const;
export const SPEED_SECONDS = 10;
export const WINDOWS_MS = [40, 80, 160] as const;

export type Steadiness = {
	taps: number;
	missed: number;
	mean: number;
	spread: number;
	within: number[];
};

export function beatTimes(start: number, bpm: number, beats: number): number[] {
	const gap = 60 / bpm;
	return Array.from({ length: beats }, (_, i) => start + i * gap);
}

export function tapErrors(
	beats: readonly number[],
	taps: readonly number[],
): (number | null)[] {
	if (beats.length < 2) return beats.map(() => null);
	const half = ((beats[1] ?? 0) - (beats[0] ?? 0)) / 2;
	const best: (number | null)[] = beats.map(() => null);
	for (const tap of taps) {
		let nearest = -1;
		let distance = Number.POSITIVE_INFINITY;
		beats.forEach((beat, i) => {
			const d = Math.abs(tap - beat);
			if (d < distance) {
				distance = d;
				nearest = i;
			}
		});
		if (nearest < 0 || distance > half) continue;
		const error = (tap - (beats[nearest] ?? 0)) * 1000;
		const had = best[nearest];
		if (had === null || had === undefined || Math.abs(error) < Math.abs(had))
			best[nearest] = error;
	}
	return best;
}

export function steadiness(errors: readonly (number | null)[]): Steadiness {
	const hits = errors.filter((e): e is number => e !== null);
	const taps = hits.length;
	const mean = taps ? hits.reduce((sum, e) => sum + e, 0) / taps : 0;
	const spread = taps
		? Math.sqrt(hits.reduce((sum, e) => sum + (e - mean) ** 2, 0) / taps)
		: 0;
	return {
		taps,
		missed: errors.length - taps,
		mean,
		spread,
		within: WINDOWS_MS.map(
			(w) => hits.filter((e) => Math.abs(e - mean) <= w).length,
		),
	};
}

export function tapSpeed(
	taps: readonly number[],
	seconds: number,
): { perSecond: number; bestSecond: number } {
	if (!(seconds > 0) || !taps.length) return { perSecond: 0, bestSecond: 0 };
	const sorted = [...taps].sort((a, b) => a - b);
	let best = 0;
	let from = 0;
	sorted.forEach((t, to) => {
		while (t - (sorted[from] ?? t) >= 1) from++;
		best = Math.max(best, to - from + 1);
	});
	return { perSecond: sorted.length / seconds, bestSecond: best };
}

export function countAtMost(sorted: readonly number[], value: number): number {
	let lo = 0;
	let hi = sorted.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if ((sorted[mid] ?? 0) <= value) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}
