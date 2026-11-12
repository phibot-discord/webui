import type { Locale } from "@/i18n/config";
import { formatDateTime } from "@/i18n/datetime";
import { localizeChartTagName } from "@/phi/lib/card-i18n";
import { chartVoteKey, type TagVotes } from "@/phi/lib/chart-tag-votes";
import { PROFILE } from "@/phi/lib/tag-profile";

export type SongTagRow = {
	id: number;
	name: string;
	category: string;
	share: number;
	votes: number;
};

export type SongTagList = { total: number; tags: SongTagRow[] };

export type SongTagsView = {
	lists: Record<string, SongTagList>;
	date?: string;
};

export function songTags(
	view: { id: string; levels: readonly { rank: string }[] },
	votes: TagVotes | undefined,
	locale: Locale,
): SongTagsView {
	if (!votes) return { lists: {} };
	const catName = new Map(votes.categories.map((c) => [c.id, c.name]));
	const lists: Record<string, SongTagList> = {};
	for (const { rank } of view.levels) {
		const row = votes.charts.get(chartVoteKey(view.id, rank));
		if (!row) continue;
		let total = 0;
		for (const v of row.values()) total += v;
		if (total < PROFILE.minChartVotes) continue;
		const tags = [...row]
			.filter(([, v]) => v / total >= PROFILE.minShare)
			.sort((a, b) => b[1] - a[1] || a[0] - b[0])
			.map(([id, v]) => {
				const tag = votes.tags.get(id);
				return {
					id,
					name: localizeChartTagName(tag?.name ?? String(id), locale),
					category: localizeChartTagName(
						catName.get(tag?.parents[0] ?? -1) ?? "",
						locale,
					),
					share: v / total,
					votes: v,
				};
			});
		if (tags.length) lists[rank] = { total, tags };
	}
	return {
		lists,
		...(votes.fetchedAt
			? { date: formatDateTime(votes.fetchedAt, locale) }
			: {}),
	};
}
