import type { ChartSummary } from "@/server/charts";

export type { ChartSummary } from "@/server/charts";

export const CHART_LEVELS = ["EZ", "HD", "IN", "AT"] as const;
export type ChartLevel = (typeof CHART_LEVELS)[number];

export type ChartRef = { id: string; rank: ChartLevel };

let pending: Promise<ChartSummary[]> | undefined;

export function loadChartCatalog(): Promise<ChartSummary[]> {
	if (!pending) {
		pending = fetch("/api/charts", { cache: "no-store" })
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

function fold(s: string) {
	return s.toLowerCase().replace(/\s+/g, "");
}

export function searchCharts(
	list: ChartSummary[],
	query: string,
	limit = 12,
): ChartSummary[] {
	const q = fold(query);
	if (!q) return [];
	const starts: ChartSummary[] = [];
	const contains: ChartSummary[] = [];
	for (const song of list) {
		const title = fold(song.song);
		if (title.startsWith(q)) starts.push(song);
		else if (
			title.includes(q) ||
			fold(song.id).includes(q) ||
			fold(song.composer).includes(q)
		)
			contains.push(song);
		if (starts.length >= limit) break;
	}
	return [...starts, ...contains].slice(0, limit);
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
