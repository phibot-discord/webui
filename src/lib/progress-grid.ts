import type { ChartStatus } from "./chart-status";

export type ProgressMetric = "clear" | "fc" | "ap";

export const PROGRESS_METRICS: ProgressMetric[] = ["clear", "fc", "ap"];

const COUNTED: Record<ProgressMetric, readonly ChartStatus[]> = {
	clear: ["ap", "fc", "clear"],
	fc: ["ap", "fc"],
	ap: ["ap"],
};

type GridRow = readonly [string, string, number, ChartStatus, ...unknown[]];

export type GridCell<R> = { rows: R[]; by: Record<ChartStatus, number> };

function emptyCell<R>(): GridCell<R> {
	return { rows: [], by: { ap: 0, fc: 0, clear: 0, played: 0, none: 0 } };
}

export function metricCount(
	cell: Pick<GridCell<unknown>, "by">,
	metric: ProgressMetric,
): number {
	return COUNTED[metric].reduce((n, s) => n + cell.by[s], 0);
}

export const cellKey = (rank: string, bucket: number) => `${rank}:${bucket}`;

export function progressGrid<R extends GridRow>(rows: readonly R[]) {
	const cells = new Map<string, GridCell<R>>();
	const totals = new Map<string, GridCell<R>>();
	let lo = Number.POSITIVE_INFINITY;
	let hi = 0;
	for (const row of rows) {
		const [, rank, constant, status] = row;
		const bucket = Math.floor(constant);
		lo = Math.min(lo, bucket);
		hi = Math.max(hi, bucket);
		for (const [map, key] of [
			[cells, cellKey(rank, bucket)],
			[totals, rank],
		] as const) {
			const cell = map.get(key) ?? emptyCell<R>();
			cell.rows.push(row);
			cell.by[status]++;
			map.set(key, cell);
		}
	}
	const buckets: number[] = [];
	for (let b = hi; b >= lo; b--) buckets.push(b);
	return { buckets, cells, totals };
}
