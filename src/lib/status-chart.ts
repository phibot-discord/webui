export type UptimeBand = "good" | "warn" | "bad" | "none";

export function niceMax(max: number): number {
	if (!(max > 0)) return 1;
	const pow = 10 ** Math.floor(Math.log10(max));
	const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= max) ?? 10;
	return step * pow;
}

export function uptimeBand(uptime: number | null): UptimeBand {
	if (uptime == null) return "none";
	if (uptime >= 99.5) return "good";
	if (uptime >= 95) return "warn";
	return "bad";
}

export function uptimeHeight(uptime: number | null): number {
	if (uptime == null) return 0;
	const t = Math.min(1, Math.max(0, (uptime - 95) / 5));
	return Math.round((0.2 + 0.8 * t) * 1000) / 1000;
}

export function linePath(
	values: (number | null)[],
	x: (i: number) => number,
	y: (v: number) => number,
): string {
	let d = "";
	let pen = false;
	values.forEach((v, i) => {
		if (v == null) {
			pen = false;
			return;
		}
		d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
		pen = true;
	});
	return d;
}

export function areaPath(
	values: (number | null)[],
	x: (i: number) => number,
	y: (v: number) => number,
	base: number,
): string {
	let d = "";
	let run: number[] = [];
	const flush = () => {
		if (!run.length) return;
		const first = run[0] ?? 0;
		const last = run.at(-1) ?? 0;
		d += `M${x(first).toFixed(1)} ${base}`;
		for (const i of run)
			d += `L${x(i).toFixed(1)} ${y(values[i] ?? 0).toFixed(1)}`;
		d += `L${x(last).toFixed(1)} ${base}Z`;
		run = [];
	};
	values.forEach((v, i) => {
		if (v == null) flush();
		else run.push(i);
	});
	flush();
	return d;
}

export function nearestIndex(
	px: number,
	left: number,
	step: number,
	count: number,
) {
	if (count <= 1) return 0;
	return Math.min(count - 1, Math.max(0, Math.round((px - left) / step)));
}

export function rollup<T extends { t: number }>(
	points: T[],
	size: number,
	keys: (keyof T)[],
): ({ t: number } & Record<string, number | null>)[] {
	const groups = new Map<number, T[]>();
	for (const p of points) {
		const t = Math.floor(p.t / size) * size;
		const list = groups.get(t);
		if (list) list.push(p);
		else groups.set(t, [p]);
	}
	return [...groups.entries()].map(([t, list]) => {
		const row: { t: number } & Record<string, number | null> = { t };
		for (const key of keys) {
			const vals = list
				.map((p) => p[key])
				.filter((v): v is T[keyof T] & number => typeof v === "number");
			row[String(key)] = vals.length
				? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
				: null;
		}
		return row;
	});
}
