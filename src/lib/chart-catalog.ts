import type { ChartCell, ChartSummary } from "@/server/charts";

export type { ChartCell, ChartSummary } from "@/server/charts";

// SP is the 4/1 specials' level; the scored catalog never has it
export const CHART_LEVELS = ["EZ", "HD", "IN", "AT", "SP"] as const;
export type ChartLevel = (typeof CHART_LEVELS)[number];

export type ChartRef = { id: string; rank: ChartLevel };

const pending: Record<"scored" | "fools", Promise<ChartSummary[]> | undefined> =
	{ scored: undefined, fools: undefined };

/** `fools` adds the 4/1 specials, which have no constant: only for pages that download or browse, never for scoring */
export function loadChartCatalog(fools = false): Promise<ChartSummary[]> {
	const slot = fools ? "fools" : "scored";
	if (!pending[slot]) {
		// "no-cache" revalidates with the ETag, so an unchanged catalog is a 304
		pending[slot] = fetch(fools ? "/api/charts?fools=1" : "/api/charts", {
			cache: "no-cache",
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(`charts ${res.status}`);
				return (await res.json()) as ChartSummary[];
			})
			.catch((err) => {
				pending[slot] = undefined;
				throw err;
			});
	}
	return pending[slot];
}

/** The constant, or the label a chart without one carries */
export function cellLabel(cell: ChartCell): string {
	return cell[2] ?? cell[0].toFixed(1);
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
