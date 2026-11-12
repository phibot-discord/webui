import { type JacketTree, sidePrefix } from "@/lib/assets";
import { bareId, CHART_LEVELS } from "@/lib/chart-catalog";
import type { NoteKinds } from "@/lib/chart-stats";
import { type ChartStatus, chartStatus } from "@/lib/chart-status";
import { type CollectionLang, chapterHeading } from "@/lib/collection";
import { clipTitle } from "@/lib/pv";
import { similarTo } from "@/lib/similar";
import { songClips } from "@/lib/song-files";
import { songPath, songSlug } from "@/lib/song-path";
import { getInfo } from "@/phi/lib/get-info";
import { phiraPackKey } from "@/phi/lib/phira";
import type { ObjectUrl } from "./asset-links";
import { type ChartSummary, chartCatalog, songCatalog } from "./charts";
import { loadCollectionIndex } from "./collection";
import { loadFools } from "./fools";
import { type SongHistory, songHistory } from "./history";
import { illKey } from "./ill";
import { loadIllLevels } from "./ill-levels";
import { loadPv } from "./pv";
import { loadRemoved } from "./removed";
import { findSong as findSide } from "./side-tree";
import { kindsOf, similarIndex } from "./similar";
import {
	type PreviewVersion,
	type SongAssets,
	songAssets,
	type Tree,
} from "./song-assets";
import { loadTextsIndex } from "./texts";

export type SongLevelView = {
	rank: string;
	constant: number;
	label?: string;
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
	scored: boolean;
	side?: JacketTree;
	from?: string;
	history?: Pick<SongHistory, "current" | "eras">;
	preview?: PreviewVersion[];
	files?: SongFilesData;
};

export type SongMetaView = Pick<SongPageView, "id" | "title" | "composer"> & {
	levels: Pick<SongLevelView, "rank" | "constant" | "label">[];
};

export async function songPaths(): Promise<string[]> {
	const { list } = await songCatalog();
	return list.map((song) => songPath(song.id));
}

type SideSong = {
	tree: JacketTree;
	stem: string;
	jacket: boolean;
	illustrator?: string;
	charts: Partial<Record<string, { charter: string; from?: string }>>;
};

type FoundSong = {
	song: ChartSummary;
	scored: boolean;
	side?: SideSong;
};

async function findSong(slug: string): Promise<FoundSong | undefined> {
	const [{ list }, scored, removed, fools] = await Promise.all([
		songCatalog(),
		chartCatalog(),
		loadRemoved(),
		loadFools(),
	]);
	const want = songSlug(slug.trim());
	const song = list.find((s) => songSlug(s.id) === want);
	if (!song) return undefined;
	const row = song.gone
		? findSide(removed, song.id)
		: song.special
			? findSide(fools, song.id)
			: undefined;
	return {
		song,
		scored: scored.list.some((s) => s.id === song.id),
		...(row
			? {
					side: {
						tree: song.gone ? "removed" : "fools",
						stem: row.stem,
						jacket: row.jacket,
						...(row.illustrator ? { illustrator: row.illustrator } : {}),
						charts: row.charts,
					},
				}
			: {}),
	};
}

function composerOf(song: ChartSummary): string {
	return song.composer || getInfo.raw(song.id)?.composer || "";
}

function labelConstant(label: string | undefined): number {
	const n = Number(label);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

function sideFrom(side: SideSong): string {
	return [...new Set(Object.values(side.charts).map((c) => c?.from ?? ""))]
		.filter(Boolean)
		.join(" / ");
}

export async function songMetaView(
	slug: string,
): Promise<SongMetaView | undefined> {
	const found = await findSong(slug);
	if (!found) return undefined;
	const { song } = found;
	return {
		id: song.id,
		title: song.song,
		composer: composerOf(song),
		levels: CHART_LEVELS.flatMap((rank) => {
			const cell = song.charts[rank];
			if (!cell) return [];
			return found.scored
				? [{ rank, constant: cell[0] }]
				: [
						{
							rank,
							constant: labelConstant(cell[2]),
							...(cell[2] ? { label: cell[2] } : {}),
						},
					];
		}),
	};
}

export async function songPageView(
	slug: string,
	links: ObjectUrl,
): Promise<SongPageView | undefined> {
	const found = await findSong(slug);
	if (!found) return undefined;
	const { song, scored, side } = found;
	const info = scored ? getInfo.raw(song.id) : undefined;
	const sp =
		scored && !getInfo.ori_info[song.id] && Boolean(getInfo.sp_info[song.id]);
	const stem = scored ? bareId(song.id) : (side?.stem ?? bareId(song.id));
	const historyJob = scored
		? songHistory(song.id).catch(() => undefined)
		: Promise.resolve(undefined);
	const [history, perLevel, assets] = await Promise.all([
		historyJob,
		loadIllLevels().catch(() => new Map<string, string[]>()),
		songAssets(song.id, links, historyJob).catch(() => undefined),
	]);
	const ownJackets = new Set(
		scored ? (perLevel.get(song.id) ?? perLevel.get(stem) ?? []) : [],
	);
	const levels: SongLevelView[] = [];
	for (const rank of CHART_LEVELS) {
		const cell = song.charts[rank];
		if (!cell) continue;
		if (!scored) {
			levels.push({
				rank,
				constant: labelConstant(cell[2]),
				...(cell[2] ? { label: cell[2] } : {}),
				notes: cell[1],
				charter: side?.charts[rank]?.charter.trim() || "",
				kinds: null,
			});
			continue;
		}
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
	const sideTree = scored ? undefined : side?.tree;
	const tree: Tree = sideTree ?? "current";
	const root = sideTree ? `${sidePrefix(sideTree)}/` : "";
	const art = sp ? "sp" : (sideTree ?? "normal");
	const showArt = scored || side?.jacket;
	const jacket = showArt ? links(illKey(stem, "low", art)) : undefined;
	const jacketFull = showArt ? links(illKey(stem, "common", art)) : undefined;
	const music = sp ? undefined : links(`${root}music/${stem}.ogg`);
	const fallback: PreviewVersion[] = music
		? [
				{
					id: tree,
					tree,
					levels: levels.flatMap((l) => {
						const packed = sideTree === "fools";
						const chart = packed
							? links(phiraPackKey(stem, l.rank, sidePrefix("fools")))
							: PREVIEW_LEVELS.has(l.rank)
								? links(`${root}chart/${stem}/${l.rank}.json`)
								: undefined;
						const cover =
							l.jacket ?? (scored ? links(illKey(stem, "low")) : jacket);
						const from =
							sideTree === "removed" ? side?.charts[l.rank]?.from : undefined;
						return chart
							? [
									{
										rank: l.rank,
										source: {
											chart,
											pack: packed,
											music,
											...(cover ? { cover } : {}),
										},
										...(from ? { from } : {}),
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
		illustrator:
			(
				info?.illustrator ??
				side?.illustrator ??
				getInfo.raw(song.id)?.illustrator
			)?.trim() || "",
		chapter: info?.chapter?.trim() || "",
		bpm: info?.bpm?.trim() || "",
		length: info?.length?.trim() || "",
		aliases: song.aliases ?? [],
		...(jacket ? { jacket } : {}),
		...(jacketFull ? { jacketFull } : {}),
		levels,
		scored,
		...(side ? { side: side.tree, from: sideFrom(side) } : {}),
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
