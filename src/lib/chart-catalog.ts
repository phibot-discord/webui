import type { ChartSummary } from "@/server/charts";
import { rankSongs } from "./song-search";

export type { ChartSummary } from "@/server/charts";

export const CHART_LEVELS = ["EZ", "HD", "IN", "AT"] as const;
export type ChartLevel = (typeof CHART_LEVELS)[number];

export type ChartRef = { id: string; rank: ChartLevel };

let pending: Promise<ChartSummary[]> | undefined;

export function loadChartCatalog(): Promise<ChartSummary[]> {
	if (!pending) {
		// "no-cache" revalidates with the ETag, so an unchanged catalog is a 304
		pending = fetch("/api/charts", { cache: "no-cache" })
			.then(async (res) => {
				if (!res.ok) throw new Error(`charts ${res.status}`);
				return (await res.json()) as ChartSummary[];
			})
			.catch((err) => {
				pending = undefined;
				throw err;
			});
	}
	return pending;
}

/** Ranked songs only; use `rankSongs` to also see which title or alias matched */
export function searchCharts(
	list: ChartSummary[],
	query: string,
	limit = 12,
): ChartSummary[] {
	return rankSongs(list, query, { limit }).map((m) => m.song);
}

export function findChart(
	list: ChartSummary[],
	ref: ChartRef,
):
	| { song: ChartSummary; difficulty: number; notes: number | null }
	| undefined {
	const song = list.find((s) => s.id === ref.id);
	const cell = song?.charts[ref.rank];
	if (!song || !cell) return;
	return { song, difficulty: cell[0], notes: cell[1] };
}
