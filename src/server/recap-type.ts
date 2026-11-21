import { type Pgti, pgtiOf } from "@/lib/pgti";
import { pgtiWindow } from "@/lib/pgti-window";
import { type WrappedTimeline, yearRange } from "@/lib/wrapped";
import type { Save } from "@/phi/lib/save";
import type { SaveHistory } from "@/phi/lib/save-history";
import { type ChartSummary, chartCell } from "./charts";

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

export type RollingOpts = {
	constantOf?: (id: string, rank: string) => number | undefined;
	now?: number;
};

export function rollingPgti(
	save: Save,
	history: Pick<SaveHistory, "rks" | "scoreHistory">,
	list: readonly ChartSummary[],
	opts: RollingOpts = {},
): { pgti: Pgti; first: string; last: string } | null {
	const clock = opts.now ?? Date.now();
	const modified = new Date(
		save.saveInfo.modifiedAt?.iso ?? Number.NaN,
	).getTime();
	const now = Number.isFinite(modified) ? Math.max(modified, clock) : clock;
	const period = pgtiWindow(history.scoreHistory, history.rks, now);
	if (!period) return null;
	const pgti = pgtiOf({
		history: history.scoreHistory,
		constantOf: opts.constantOf ?? ((id, rank) => chartCell(id, rank)?.[0]),
		constants: catalogConstants(list),
		until: now,
		...period,
	});
	return pgti ? { pgti, first: period.first, last: period.last } : null;
}
