import type { NoteKinds } from "@/lib/chart-stats";
import {
	buildSimilarIndex,
	type ChartFeature,
	parseBpm,
	parseLength,
	type SimilarIndex,
} from "@/lib/similar";
import {
	chartVoteKey,
	loadTagVotes,
	type TagVotes,
} from "@/phi/lib/chart-tag-votes";
import { LEVEL } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import { PROFILE } from "@/phi/lib/tag-profile";
import { type ChartSummary, chartCatalog } from "./charts";

let memo:
	| { list: readonly ChartSummary[]; sha: string; index: SimilarIndex }
	| undefined;

function tagSharesOf(
	votes: TagVotes | undefined,
	id: string,
	rank: string,
): Map<number, number> | null {
	const row = votes?.charts.get(chartVoteKey(id, rank));
	if (!row) return null;
	let total = 0;
	for (const v of row.values()) total += v;
	if (total < PROFILE.minChartVotes) return null;
	const out = new Map<number, number>();
	for (const [tag, v] of row)
		if (v / total >= PROFILE.minShare) out.set(tag, v / total);
	return out.size ? out : null;
}

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

function featuresOf(
	list: readonly ChartSummary[],
	votes?: TagVotes,
): ChartFeature[] {
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
				tags: tagSharesOf(votes, song.id, rank),
			});
		}
	}
	return out;
}

export async function similarIndex(): Promise<SimilarIndex> {
	const [{ list }, votes] = await Promise.all([
		chartCatalog(),
		loadTagVotes().catch(() => undefined),
	]);
	const sha = votes?.sha ?? "";
	if (memo?.list !== list || memo.sha !== sha) {
		memo = { list, sha, index: buildSimilarIndex(featuresOf(list, votes)) };
	}
	return memo.index;
}
