export const ASPECT = 16 / 9;

export function corsUrl(url: string): string {
	return `${url}${url.includes("?") ? "&" : "?"}cors=1`;
}

export function lastAtOrBefore(
	keys: Float64Array,
	lo: number,
	hi: number,
	t: number,
): number {
	let a = lo;
	let b = hi;
	while (a < b) {
		const m = (a + b) >> 1;
		if (keys[m]! <= t) a = m + 1;
		else b = m;
	}
	return a - 1;
}

export function firstAfter(
	keys: Float64Array,
	t: number,
	lo = 0,
	hi = keys.length,
): number {
	return lastAtOrBefore(keys, lo, hi, t) + 1;
}

export function firstAtOrAfter(
	keys: Float64Array,
	t: number,
	lo = 0,
	hi = keys.length,
): number {
	let a = lo;
	let b = hi;
	while (a < b) {
		const m = (a + b) >> 1;
		if (keys[m]! < t) a = m + 1;
		else b = m;
	}
	return a;
}
