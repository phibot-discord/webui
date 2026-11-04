import { type ChartStatus, chartStatus } from "@/lib/chart-status";
import { parseBpm, parseLength } from "@/lib/similar";
import { localizeChartTagName, type PhiLocale } from "@/phi/lib/card-i18n";
import { chartVoteKey, type TagVotes } from "@/phi/lib/chart-tag-votes";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import type { Save } from "@/phi/lib/save";
import { PROFILE } from "@/phi/lib/tag-profile";
import type { ChartSummary } from "./charts";

export type BrowseSong = {
	id: string;
	title: string;
	composer: string;
	chapter: string;
	bpm: number | null;
	length: number | null;
};

export type BrowseChart = [
	song: number,
	rank: LevelKind,
	c: number,
	notes: number,
	tap: number,
	drag: number,
	hold: number,
	flick: number,
	charter: string,
	tags: number[],
];

export type BrowseTag = { id: number; name: string; cat: string };

export type BrowseView = {
	songs: BrowseSong[];
	charts: BrowseChart[];
	tags: BrowseTag[];
	chapters: string[];
};

export type BrowseMine = Record<string, [status: ChartStatus, acc: number]>;

let memo:
	| {
			list: readonly ChartSummary[];
			sha: string;
			locale: PhiLocale;
			view: BrowseView;
	  }
	| undefined;

function chartTags(votes: TagVotes | undefined, id: string, rank: string) {
	const row = votes?.charts.get(chartVoteKey(id, rank));
	if (!row) return [];
	let total = 0;
	for (const v of row.values()) total += v;
	if (total < PROFILE.minChartVotes) return [];
	return [...row]
		.filter(([, v]) => v / total >= PROFILE.minShare)
		.sort((a, b) => b[1] - a[1] || a[0] - b[0])
		.map(([tag]) => tag);
}

export function browseView(
	list: readonly ChartSummary[],
	votes: TagVotes | undefined,
	locale: PhiLocale,
): BrowseView {
	const sha = votes?.sha ?? "";
	if (memo?.list === list && memo.sha === sha && memo.locale === locale)
		return memo.view;
	const songs: BrowseSong[] = [];
	const charts: BrowseChart[] = [];
	const used = new Set<number>();
	const chapters = new Set<string>();
	for (const song of list) {
		const info = getInfo.raw(song.id);
		const at = songs.length;
		let any = false;
		for (const rank of LEVEL) {
			const cell = song.charts[rank];
			if (!cell || !(cell[0] > 0)) continue;
			const raw = info?.chart?.[rank];
			const tags = chartTags(votes, song.id, rank);
			for (const tag of tags) used.add(tag);
			charts.push([
				at,
				rank,
				cell[0],
				cell[1] ?? 0,
				Number(raw?.tap) || 0,
				Number(raw?.drag) || 0,
				Number(raw?.hold) || 0,
				Number(raw?.flick) || 0,
				raw?.charter ?? "",
				tags,
			]);
			any = true;
		}
		if (!any) continue;
		const chapter = info?.chapter && info.chapter !== "--" ? info.chapter : "";
		if (chapter) chapters.add(chapter);
		songs.push({
			id: song.id,
			title: song.song,
			composer: song.composer || info?.composer || "",
			chapter,
			bpm: parseBpm(info?.bpm),
			length: parseLength(info?.length),
		});
	}
	const catName = new Map(votes?.categories.map((c) => [c.id, c.name]) ?? []);
	const tags: BrowseTag[] = [...used]
		.map((id) => {
			const tag = votes?.tags.get(id);
			const cat = catName.get(tag?.parents[0] ?? -1) ?? "";
			return {
				id,
				name: localizeChartTagName(tag?.name ?? String(id), locale),
				cat: localizeChartTagName(cat, locale),
			};
		})
		.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
	const view = {
		songs,
		charts,
		tags,
		chapters: [...chapters].sort((a, b) => a.localeCompare(b)),
	};
	memo = { list, sha, locale, view };
	return view;
}

export function browseMine(
	save: Save,
	list: readonly ChartSummary[],
): BrowseMine {
	const out: BrowseMine = {};
	for (const song of list) {
		const records = save.gameRecord[song.id];
		if (!records) continue;
		LEVEL.forEach((rank, i) => {
			const rec = records[i];
			if (!rec || !(rec.score > 0)) return;
			out[`${song.id}:${rank}`] = [
				chartStatus(rec),
				Number(rec.acc.toFixed(4)),
			];
		});
	}
	return out;
}
