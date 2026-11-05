import { bareId } from "@/lib/chart-catalog";
import { songPath } from "@/lib/song-path";
import { TAG_CLIPS } from "@/lib/tag-clips";
import type { LevelKind } from "@/phi/lib/const";
import type { ObjectUrl } from "./asset-links";
import { chartCatalog } from "./charts";
import { illKey } from "./ill";
import { loadIllLevels } from "./ill-levels";
import type { PreviewSource } from "./song-assets";

export type TagClipView = {
	title: string;
	path: string;
	level: string;
	constant: number;
	source: PreviewSource;
	start: number;
	length: number;
	votes: number;
	total: number;
};

export async function tagClipViews(
	links: ObjectUrl,
): Promise<Record<string, TagClipView>> {
	const [{ list }, perLevel] = await Promise.all([
		chartCatalog(),
		loadIllLevels().catch(() => new Map<string, string[]>()),
	]);
	const byId = new Map(list.map((s) => [s.id, s] as const));
	const out: Record<string, TagClipView> = {};
	for (const [tag, clip] of Object.entries(TAG_CLIPS.clips)) {
		const song = byId.get(clip.id);
		const cell = song?.charts[clip.level as LevelKind];
		if (!song || !cell || !(cell[0] > 0)) continue;
		const stem = bareId(song.id);
		const chart = links(`chart/${stem}/${clip.level}.json`);
		const music = links(`music/${stem}.ogg`);
		if (!chart || !music) continue;
		const own = perLevel.get(song.id) ?? perLevel.get(stem) ?? [];
		const cover = own.includes(clip.level)
			? links(illKey(stem, "low", "normal", clip.level))
			: links(illKey(stem, "low"));
		out[tag] = {
			title: song.song,
			path: songPath(song.id),
			level: clip.level,
			constant: cell[0],
			source: { chart, pack: false, music, ...(cover ? { cover } : {}) },
			start: clip.start,
			length: TAG_CLIPS.length,
			votes: clip.votes,
			total: clip.total,
		};
	}
	return out;
}
