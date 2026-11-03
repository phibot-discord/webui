import { bareId, CHART_LEVELS } from "@/lib/chart-catalog";
import type { NoteKinds } from "@/lib/chart-stats";
import { type ChartStatus, chartStatus } from "@/lib/chart-status";
import { type CollectionLang, chapterHeading } from "@/lib/collection";
import { clipTitle } from "@/lib/pv";
import { similarTo } from "@/lib/similar";
import { songClips } from "@/lib/song-files";
import { songPath, songSlug } from "@/lib/song-path";
import { getInfo } from "@/phi/lib/get-info";
import type { ObjectUrl } from "./asset-links";
import { type ChartSummary, chartCatalog } from "./charts";
import { loadCollectionIndex } from "./collection";
import { type SongHistory, songHistory } from "./history";
import { illKey } from "./ill";
import { loadIllLevels } from "./ill-levels";
import { loadPv } from "./pv";
import { kindsOf, similarIndex } from "./similar";
import {
	type PreviewVersion,
	type SongAssets,
	songAssets,
} from "./song-assets";
import { loadTextsIndex } from "./texts";

export type SongLevelView = {
	rank: string;
	constant: number;
	notes: number | null;
	charter: string;
	kinds: NoteKinds | null;
	jacket?: string;
};

export type SongFilesData = Omit<SongAssets, "preview">;

const PREVIEW_LEVELS = new Set(["EZ", "HD", "IN", "AT"]);

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
	preview?: PreviewVersion[];
	files?: SongFilesData;
};

export type SongMetaView = Pick<SongPageView, "id" | "title" | "composer"> & {
	levels: Pick<SongLevelView, "rank" | "constant">[];
};

export async function songPaths(): Promise<string[]> {
	const { list } = await chartCatalog();
	return list.map((song) => songPath(song.id));
}

async function findSong(slug: string): Promise<ChartSummary | undefined> {
	const { list } = await chartCatalog();
	const want = songSlug(slug.trim());
	return list.find((s) => songSlug(s.id) === want);
}

function composerOf(song: ChartSummary): string {
	return song.composer || getInfo.raw(song.id)?.composer || "";
}

export async function songMetaView(
	slug: string,
): Promise<SongMetaView | undefined> {
	const song = await findSong(slug);
	if (!song) return undefined;
	return {
		id: song.id,
		title: song.song,
		composer: composerOf(song),
		levels: CHART_LEVELS.flatMap((rank) => {
			const cell = song.charts[rank];
			return cell ? [{ rank, constant: cell[0] }] : [];
		}),
	};
}

export async function songPageView(
	slug: string,
	links: ObjectUrl,
): Promise<SongPageView | undefined> {
	const song = await findSong(slug);
	if (!song) return undefined;
	const info = getInfo.raw(song.id);
	const sp = !getInfo.ori_info[song.id] && Boolean(getInfo.sp_info[song.id]);
	const stem = bareId(song.id);
	const historyJob = songHistory(song.id).catch(() => undefined);
	const [history, perLevel, assets] = await Promise.all([
		historyJob,
		loadIllLevels().catch(() => new Map<string, string[]>()),
		songAssets(song.id, links, historyJob).catch(() => undefined),
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
			kinds: kindsOf(chart),
			...(ownJackets.has(rank)
				? { jacket: links(illKey(stem, "low", "normal", rank)) }
				: {}),
		});
	}
	const music = sp ? undefined : links(`music/${stem}.ogg`);
	const fallback: PreviewVersion[] = music
		? [
				{
					id: "current",
					tree: "current" as const,
					levels: levels.flatMap((l) => {
						const chart = PREVIEW_LEVELS.has(l.rank)
							? links(`chart/${stem}/${l.rank}.json`)
							: undefined;
						const cover = l.jacket ?? links(illKey(stem, "low"));
						return chart
							? [
									{
										rank: l.rank,
										source: {
											chart,
											pack: false,
											music,
											...(cover ? { cover } : {}),
										},
									},
								]
							: [];
					}),
				},
			].filter((v) => v.levels.length)
		: [];
	const preview = assets?.preview.length ? assets.preview : fallback;
	return {
		id: song.id,
		slug: songSlug(song.id),
		title: song.song,
		composer: composerOf(song),
		illustrator: info?.illustrator?.trim() || "",
		chapter: info?.chapter?.trim() || "",
		bpm: info?.bpm?.trim() || "",
		length: info?.length?.trim() || "",
		aliases: song.aliases ?? [],
		jacket: links(illKey(stem, "low", sp ? "sp" : "normal")),
		jacketFull: links(illKey(stem, "common", sp ? "sp" : "normal")),
		levels,
		...(history?.eras.length
			? { history: { current: history.current, eras: history.eras } }
			: {}),
		...(preview.length ? { preview } : {}),
		...(assets &&
		(assets.music.length || assets.art.length || assets.charts.length)
			? {
					files: {
						music: assets.music,
						art: assets.art,
						charts: assets.charts,
					},
				}
			: {}),
	};
}

export type SongFilesView = {
	chapter?: { id: string; label: string; name: string };
	clips: { id: string; title: string; own: boolean }[];
};

export async function songFilesView(
	view: Pick<SongPageView, "id" | "title">,
	lang: CollectionLang,
): Promise<SongFilesView> {
	const [index, clips, texts] = await Promise.all([
		loadCollectionIndex(),
		loadPv(),
		loadTextsIndex(),
	]);
	const got = songClips(
		{
			id: view.id,
			title: view.title,
			chapter: getInfo.raw(view.id)?.chapter ?? "",
		},
		clips,
		index.chapters,
		(clip) => texts.transcripts.get(clip)?.chapter,
	);
	const chapter = got.chapterId
		? index.chapters.find((c) => c.id === got.chapterId)
		: undefined;
	return {
		...(chapter
			? { chapter: { id: chapter.id, ...chapterHeading(chapter, lang) } }
			: {}),
		clips: [
			...got.own.map((c) => ({
				id: c.id,
				title: clipTitle(c.name),
				own: true,
			})),
			...got.chapter.map((c) => ({
				id: c.id,
				title: clipTitle(c.name),
				own: false,
			})),
		],
	};
}

export type SimilarRow = {
	id: string;
	rank: string;
	c: number;
	title: string;
	status?: ChartStatus;
	acc?: number;
};

export type PlayedChart = (
	id: string,
	rank: string,
) => { score: number; fc: boolean; acc: number } | undefined;

export async function songSimilar(
	view: Pick<SongPageView, "id" | "levels">,
	played?: PlayedChart,
): Promise<Record<string, SimilarRow[]>> {
	const [index, { list }] = await Promise.all([similarIndex(), chartCatalog()]);
	const names = new Map(list.map((s) => [s.id, s.song] as const));
	const out: Record<string, SimilarRow[]> = {};
	for (const level of view.levels) {
		const hits = similarTo(index, view.id, level.rank);
		if (!hits.length) continue;
		out[level.rank] = hits.map((h) => {
			const rec = played?.(h.id, h.rank);
			return {
				id: h.id,
				rank: h.rank,
				c: h.c,
				title: names.get(h.id) ?? bareId(h.id),
				...(played
					? { status: chartStatus(rec), ...(rec ? { acc: rec.acc } : {}) }
					: {}),
			};
		});
	}
	return out;
}
