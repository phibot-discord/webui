import type { NoteKinds } from "@/lib/chart-stats";
import {
	buildSimilarIndex,
	type ChartFeature,
	parseBpm,
	parseLength,
	type SimilarIndex,
} from "@/lib/similar";
import { LEVEL } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import { type ChartSummary, chartCatalog } from "./charts";

let memo: { list: readonly ChartSummary[]; index: SimilarIndex } | undefined;

export function kindsOf(
	chart:
		| {
				tap?: number;
				drag?: number;
				hold?: number;
				flick?: number;
		  }
		| undefined,
): NoteKinds | null {
	if (!chart) return null;
	const kinds = {
		tap: Number(chart.tap) || 0,
		drag: Number(chart.drag) || 0,
		hold: Number(chart.hold) || 0,
		flick: Number(chart.flick) || 0,
	};
	return kinds.tap + kinds.drag + kinds.hold + kinds.flick ? kinds : null;
}

export function featuresOf(list: readonly ChartSummary[]): ChartFeature[] {
	const out: ChartFeature[] = [];
	for (const song of list) {
		const info = getInfo.raw(song.id);
		const length = parseLength(info?.length);
		const bpm = parseBpm(info?.bpm);
		for (const rank of LEVEL) {
			const cell = song.charts[rank];
			if (!cell || !(cell[0] > 0)) continue;
			out.push({
				id: song.id,
				rank,
				c: cell[0],
				notes: cell[1],
				kinds: kindsOf(info?.chart?.[rank]),
				length,
				bpm,
			});
		}
	}
	return out;
}

export async function similarIndex(): Promise<SimilarIndex> {
	const { list } = await chartCatalog();
	if (memo?.list !== list) {
		memo = { list, index: buildSimilarIndex(featuresOf(list)) };
	}
	return memo.index;
}
