import { bareId } from "@/lib/chart-catalog";
import { songPath } from "@/lib/song-path";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import type { ObjectUrl } from "./asset-links";
import type { ChartSummary } from "./charts";
import { illKey } from "./ill";
import type { PreviewSource } from "./song-assets";

export type PreviewItem = {
	title: string;
	path: string;
	level: LevelKind;
	constant: number;
	source: PreviewSource;
};

export function previewItem(
	list: readonly ChartSummary[],
	perLevel: ReadonlyMap<string, readonly string[]>,
	links: ObjectUrl,
	id: string,
	rank: string,
): PreviewItem | undefined {
	if (!(LEVEL as readonly string[]).includes(rank)) return undefined;
	const level = rank as LevelKind;
	const song = list.find((s) => s.id === id);
	const cell = song?.charts[level];
	if (!song || !cell || !(cell[0] > 0)) return undefined;
	const stem = bareId(song.id);
	const chart = links(`chart/${stem}/${level}.json`);
	const music = links(`music/${stem}.ogg`);
	if (!chart || !music) return undefined;
	const own = perLevel.get(song.id) ?? perLevel.get(stem) ?? [];
	const cover = own.includes(level)
		? links(illKey(stem, "low", "normal", level))
		: links(illKey(stem, "low"));
	return {
		title: song.song,
		path: songPath(song.id),
		level,
		constant: cell[0],
		source: { chart, pack: false, music, ...(cover ? { cover } : {}) },
	};
}
