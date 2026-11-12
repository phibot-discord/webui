import { type Pgti, pgtiOf } from "@/lib/pgti";
import { type WrappedTimeline, yearRange } from "@/lib/wrapped";
import type { SaveHistory } from "@/phi/lib/save-history";
import type { ChartSummary } from "./charts";

export function catalogConstants(list: readonly ChartSummary[]): number[] {
	const constants: number[] = [];
	for (const song of list) {
		for (const [rank, cell] of Object.entries(song.charts))
			if (rank !== "SP" && cell && cell[0] > 0) constants.push(cell[0]);
	}
	return constants;
}

export function recapPgti(input: {
	timeline: WrappedTimeline | null;
	history: Pick<SaveHistory, "scoreHistory">;
	list: readonly ChartSummary[];
	constantOf: (id: string, rank: string) => number | undefined;
	year: number;
}): Pgti | null {
	const { timeline } = input;
	if (!timeline) return null;
	return pgtiOf({
		history: input.history.scoreHistory,
		constantOf: input.constantOf,
		constants: catalogConstants(input.list),
		until: yearRange(input.year).end,
		days: timeline.days.map((d) => d.day),
		first: timeline.first,
		last: timeline.last,
		rks: {
			start: timeline.startRks,
			end: timeline.rks.at(-1)?.value ?? null,
		},
	});
}
