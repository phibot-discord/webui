import type { TagAnalysis } from "@/phi/lib/b30-analysis";
import { slotsStddev } from "@/phi/lib/b30-analysis";
import { localizeChartTagLabels, type PhiLocale } from "@/phi/lib/card-i18n";
import {
	CHART_TAG_VOTES_SOURCE,
	type TagVotes,
} from "@/phi/lib/chart-tag-votes";
import { fCompute } from "@/phi/lib/fcompute";
import type { Save } from "@/phi/lib/save";
import {
	type ChartGroup,
	historyProfileDetail,
	PROFILE,
	type ProfileBasis,
	type ProfileCategory,
	type ProfileTagRow,
	profileRecordsOf,
	type ScoreHistoryRows,
	type TagChart,
	tagProfileDetail,
} from "@/phi/lib/tag-profile";
import { type ChartSummary, chartCell } from "./charts";

export type ProfileB30Row = {
	slot: string;
	id: string;
	song: string;
	rank: string;
	c: number;
	score: number;
	acc: number;
	rks: number;
	fc: boolean;
	push: string | null;
};

export type ProfileChartRow = {
	id: string;
	song: string;
	rank: string;
	c: number;
	acc: number;
	rks: number;
	weight: number;
	expected: number;
	curveRks: number;
	diff: number;
	group: ChartGroup;
	votes: number;
};

export type ProfileTagUse = { chart: number; share: number; votes: number };

export type ProfileTagView = ProfileTagRow & { uses: ProfileTagUse[] };

export type ProfileCategoryView = ProfileCategory & { uses: ProfileTagUse[] };

export type TagProfileView = Pick<
	TagAnalysis,
	| "range"
	| "recordCount"
	| "chartCount"
	| "totalVotes"
	| "averageRks"
	| "rks"
	| "insufficient"
> & {
	categories: ProfileCategoryView[];
	tags: ProfileTagView[];
	charts: ProfileChartRow[];
	basis: ProfileBasis;
	asOf?: string;
	fetchedAt?: string;
	source: string;
	minTagCharts: number;
	minHold: number;
	firmHold: number;
	minCharts: number;
};

export type PlayerProfileView = {
	best: ProfileB30Row[];
	extra: ProfileB30Row[];
	average: number;
	stddev: number;
	profile: TagProfileView | null;
	votesMissing: boolean;
};

type B19Row = {
	id: string;
	rank: string;
	rks: number;
	difficulty: number;
	acc: number;
	score: number;
	fc: boolean;
	song?: string;
	suggest?: string;
};

function pushOf(suggest: string | undefined): string | null {
	return suggest && /%$/.test(suggest) ? suggest : null;
}

function rowOf(slot: string, r: B19Row, songs: Map<string, string>) {
	return {
		slot,
		id: r.id,
		song: r.song || songs.get(r.id) || r.id.replace(/\.0$/, ""),
		rank: r.rank,
		c: r.difficulty,
		score: r.score,
		acc: r.acc,
		rks: r.rks,
		fc: Boolean(r.fc),
		push: pushOf(r.suggest),
	};
}

function uses(list: TagChart[] | undefined): ProfileTagUse[] {
	return (list ?? []).map((u) => ({
		chart: u.chart,
		share: u.share,
		votes: u.votes,
	}));
}

export function playerProfileView(
	save: Save,
	list: readonly ChartSummary[],
	votes: TagVotes | undefined,
	locale: PhiLocale,
	history?: ScoreHistoryRows,
): PlayerProfileView {
	const songs = new Map(list.map((s) => [s.id, s.song] as const));
	const b19 = save.getB19(33);
	const phi = (b19.phi ?? []).flatMap((r, i) =>
		r ? [rowOf(`P${i + 1}`, r as B19Row, songs)] : [],
	);
	const ranked = (b19.b19_list ?? []).map((r, i) =>
		rowOf(`B${i + 1}`, r as B19Row, songs),
	);
	const slots = [...phi, ...ranked.slice(0, 27)];
	const average = slots.length
		? slots.reduce((s, r) => s + r.rks, 0) / slots.length
		: 0;
	const stddev = slotsStddev(
		slots.map((r) => ({
			kind: r.slot.startsWith("P") ? ("phi" as const) : ("best" as const),
			rks: r.rks,
		})),
	);
	let profile: TagProfileView | null = null;
	if (votes) {
		let detail = tagProfileDetail(profileRecordsOf(save.gameRecord), votes);
		if (detail.analysis.basis === "aps" && history)
			detail =
				historyProfileDetail(
					history,
					(id, rank) => chartCell(id, rank)?.[0],
					votes,
				) ?? detail;
		const a = localizeChartTagLabels(detail.analysis, locale);
		const tagUses = [...detail.byTag].map(
			([name, list]) => [name, list] as const,
		);
		const usesByName = new Map(tagUses);
		profile = {
			range: a.range,
			recordCount: a.recordCount,
			chartCount: a.chartCount,
			totalVotes: a.totalVotes,
			averageRks: a.averageRks,
			rks: a.rks,
			insufficient: a.insufficient,
			categories: a.categories.map((c, i) => ({
				...c,
				uses: uses(detail.byCategory.get(detail.analysis.categories[i]!.name)),
			})),
			tags: a.tags.map((t, i) => ({
				...t,
				uses: uses(usesByName.get(detail.analysis.tags[i]!.name)),
			})),
			charts: detail.charts.map((c) => ({
				id: c.id,
				song: songs.get(c.id) ?? c.id.replace(/\.0$/, ""),
				rank: c.level,
				c: c.difficulty,
				acc: c.acc,
				rks: c.rks,
				weight: c.weight,
				expected: c.expected,
				curveRks: fCompute.rks(c.baseline, c.difficulty),
				diff: c.diff,
				group: c.group,
				votes: c.votes,
			})),
			basis: a.basis,
			...(a.asOf ? { asOf: a.asOf } : {}),
			fetchedAt: votes.fetchedAt,
			source: CHART_TAG_VOTES_SOURCE,
			minTagCharts: PROFILE.minTagCharts,
			minHold: PROFILE.minHold,
			firmHold: PROFILE.firmHold,
			minCharts: PROFILE.minCharts,
		};
	}
	return {
		best: slots,
		extra: ranked.slice(27),
		average,
		stddev,
		profile,
		votesMissing: !votes,
	};
}
