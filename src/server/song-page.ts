import { bareId, CHART_LEVELS } from "@/lib/chart-catalog";
import type { NoteKinds } from "@/lib/chart-stats";
import { songPath, songSlug } from "@/lib/song-path";
import { getInfo } from "@/phi/lib/get-info";
import type { ObjectUrl } from "./asset-links";
import { chartCatalog } from "./charts";
import { type SongHistory, songHistory } from "./history";
import { loadIllLevels } from "./ill-levels";
import { r2Config } from "./r2";

export type SongLevelView = {
	rank: string;
	constant: number;
	notes: number | null;
	charter: string;
	kinds: NoteKinds | null;
	jacket?: string;
};

export type SongPageView = {
	id: string;
	slug: string;
	title: string;
	composer: string;
	illustrator: string;
	chapter: string;
	bpm: string;
	length: string;
	aliases: string[];
	jacket?: string;
	jacketFull?: string;
	levels: SongLevelView[];
	history?: Pick<SongHistory, "current" | "eras">;
};

function kindsOf(chart: {
	tap?: number;
	drag?: number;
	hold?: number;
	flick?: number;
}): NoteKinds | null {
	const kinds = {
		tap: Number(chart.tap) || 0,
		drag: Number(chart.drag) || 0,
		hold: Number(chart.hold) || 0,
		flick: Number(chart.flick) || 0,
	};
	return kinds.tap + kinds.drag + kinds.hold + kinds.flick ? kinds : null;
}

function jacketKey(
	stem: string,
	sp: boolean,
	size: "illLow" | "ill",
	level?: string,
) {
	const prefix = r2Config().prefix || "original_ill";
	if (sp) return `${prefix}/SP/${stem}.png`;
	return level
		? `${prefix}/${size}/${level}/${stem}.png`
		: `${prefix}/${size}/${stem}.png`;
}

export async function songPaths(): Promise<string[]> {
	const { list } = await chartCatalog();
	return list.map((song) => songPath(song.id));
}

export async function songPageView(
	slug: string,
	links: ObjectUrl,
): Promise<SongPageView | undefined> {
	const { list } = await chartCatalog();
	const want = songSlug(slug.trim());
	const song = list.find((s) => songSlug(s.id) === want);
	if (!song) return undefined;
	const info = getInfo.raw(song.id);
	const sp = !getInfo.ori_info[song.id] && Boolean(getInfo.sp_info[song.id]);
	const stem = bareId(song.id);
	const [history, perLevel] = await Promise.all([
		songHistory(song.id).catch(() => undefined),
		loadIllLevels().catch(() => new Map<string, string[]>()),
	]);
	const ownJackets = new Set(perLevel.get(song.id) ?? perLevel.get(stem) ?? []);
	const levels: SongLevelView[] = [];
	for (const rank of CHART_LEVELS) {
		const cell = song.charts[rank];
		if (!cell) continue;
		const chart = info?.chart?.[rank];
		levels.push({
			rank,
			constant: cell[0],
			notes: cell[1],
			charter: chart?.charter?.trim() || "",
			kinds: chart ? kindsOf(chart) : null,
			...(ownJackets.has(rank)
				? { jacket: links(jacketKey(stem, false, "illLow", rank)) }
				: {}),
		});
	}
	return {
		id: song.id,
		slug: songSlug(song.id),
		title: song.song,
		composer: song.composer || info?.composer || "",
		illustrator: info?.illustrator?.trim() || "",
		chapter: info?.chapter?.trim() || "",
		bpm: info?.bpm?.trim() || "",
		length: info?.length?.trim() || "",
		aliases: song.aliases ?? [],
		jacket: links(jacketKey(stem, sp, "illLow")),
		jacketFull: links(jacketKey(stem, sp, "ill")),
		levels,
		...(history?.eras.length
			? { history: { current: history.current, eras: history.eras } }
			: {}),
	};
}
