import type { Crumb } from "@/components/Breadcrumb";
import type { ViewItem } from "@/components/CollectionChapter";
import type { ViewChapter } from "@/components/CollectionNav";
import type { CutsceneView } from "@/components/Cutscene";
import type { HiddenDownload, HiddenSongView } from "@/components/HiddenSong";
import type { ClipOverlay, PlayerGroup } from "@/components/Pv";
import { type Locale, localeTag } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { formatSize, SIDE_TREES, type SideTab } from "@/lib/assets";
import { type Cutscene, unlockChapter, unlocksHiddenSong } from "@/lib/c9s6";
import {
	type CollectionLang,
	chapterHeading,
	chapterShort,
	entryText,
	fileItems,
	parseProperties,
	type SearchHit,
	searchCollection,
	textKey,
} from "@/lib/collection";
import {
	entryArt,
	entryBefore,
	entryPlace,
	entryTile,
} from "@/lib/collection-art";
import {
	collectionHref,
	type FilesView,
	NAV_VIEWS,
	parseParam,
	parseTimelineTab,
	TIMELINE_TABS,
	textsHref,
	timelineHref,
	viewHref,
} from "@/lib/files-view";
import {
	clipTitle,
	formatDuration,
	groupClips,
	groupLabel,
	type OverlayIndex,
} from "@/lib/pv";
import {
	CREDITS_GROUP,
	parseTextSection,
	TEXT_SECTIONS,
	type Transcript,
	textAnchor,
	type ViewTextGroup,
} from "@/lib/texts";
import { TERM_KINDS } from "@/lib/timeline";
import { describeUnlock } from "@/lib/unlock";
import { fill } from "@/phi/lib/card-i18n";
import { type ObjectUrl, objectUrls } from "./asset-links";
import { loadHiddenSong, objectSizes } from "./c9s6";
import {
	loadCollectionArt,
	loadCollectionIndex,
	loadCollectionText,
} from "./collection";
import { buildDeduction } from "./deduction";
import { loadFools } from "./fools";
import { loadHistory } from "./history";
import type { PageMetaOpts } from "./og-meta";
import { loadOverlays, loadPv, missingClips } from "./pv";
import { loadRemoved } from "./removed";
import { loadStoryGroups, loadTextsIndex, viewTextGroups } from "./texts";

const DEFAULT_CHAPTER = "c1";
const OTHER_CHAPTER = "other";

function langFirst<T extends { key?: string }>(list: T[], lang: string): T[] {
	return [
		...list.filter((v) => v.key === lang),
		...list.filter((v) => v.key !== lang),
	];
}

function overlayOf(
	overlays: OverlayIndex,
	id: string,
	lang: CollectionLang,
	link: ObjectUrl,
): ClipOverlay | undefined {
	const entry = overlays.get(id);
	if (!entry) return undefined;
	const all = entry.versions.flatMap((v) => {
		const url = link(v.file);
		if (!url) return [];
		return [
			{ ...(v.key ? { key: v.key } : {}), url, filename: fileName(v.file) },
		];
	});
	const versions = entry.kind === "lang" ? langFirst(all, lang) : all;
	if (!versions.length) return undefined;
	return {
		kind: entry.kind,
		versions,
		...(entry.fixed ? { fixed: true } : {}),
	};
}

/** A PV's captions now live with their chapter in the Collection; the About us staff roll on Other resources */
function transcriptOf(at: Transcript | undefined): string | undefined {
	if (!at) return undefined;
	if (at.chapter) {
		return `${collectionHref(at.chapter)}#${textAnchor(at.group)}`;
	}
	return at.group === CREDITS_GROUP ? textsHref("credits") : undefined;
}

export async function buildPvGroups(
	m: Messages,
	lang: CollectionLang,
): Promise<PlayerGroup[]> {
	const clipList = loadPv();
	const links = objectUrls();
	const [clips, missing, index, overlays, texts, link, replay] =
		await Promise.all([
			clipList,
			clipList.then(missingClips),
			loadCollectionIndex(),
			loadOverlays(),
			loadTextsIndex(),
			links,
			Promise.all([clipList, links]).then(([list, url]) =>
				list.some((c) => c.replay === "deduction")
					? buildDeduction(url)
					: undefined,
			),
		]);
	const groups: PlayerGroup[] = [];
	for (const g of groupClips(clips, index.chapters)) {
		const listed = g.clips.flatMap((clip) => {
			const url = link(clip.file);
			if (!url) return [];
			return [
				{
					id: clip.id,
					title: clipTitle(clip.name),
					duration: formatDuration(clip.duration),
					detail: `${clip.width}×${clip.height} · ${formatSize(clip.size)}`,
					audio: clip.audio,
					url,
					available: !missing.has(clip.id),
					overlay: overlayOf(overlays, clip.id, lang, link),
					transcript: transcriptOf(texts.transcripts.get(clip.id)),
					...(clip.replay === "deduction" && replay ? { replay } : {}),
				},
			];
		});
		if (!listed.length) continue;
		const heading = g.chapter ? chapterHeading(g.chapter, lang) : undefined;
		groups.push({
			id: g.group || OTHER_CHAPTER,
			label: heading?.label ?? "",
			name:
				heading?.name ||
				fill(m.pv.event, { name: groupLabel(g.group) || m.collection.other }),
			clips: listed,
		});
	}
	return groups;
}

export type CollectionData = {
	chapters: ViewChapter[];
	current: ViewChapter;
	items: ViewItem[];
	story: ViewTextGroup[];
};

function chapterNav(
	{ chapters, unfiled }: ReturnType<typeof fileItems>,
	lang: CollectionLang,
	t: Messages["collection"],
): ViewChapter[] {
	const nav: ViewChapter[] = chapters.map(({ chapter, items }) => ({
		id: chapter.id,
		kind: chapter.kind,
		short: chapterShort(chapter, t.extraShort),
		...chapterHeading(chapter, lang),
		count: items.length,
	}));
	if (unfiled.length) {
		nav.push({
			id: OTHER_CHAPTER,
			kind: OTHER_CHAPTER,
			short: t.other,
			label: "",
			name: t.other,
			count: unfiled.length,
		});
	}
	return nav;
}

export type CollectionSearchData = {
	chapters: ViewChapter[];
	hits: SearchHit[];
	total: number;
};

export async function buildCollectionSearch(
	m: Messages,
	lang: CollectionLang,
	q: string,
): Promise<CollectionSearchData | undefined> {
	const [index, text, original] = await Promise.all([
		loadCollectionIndex(),
		loadCollectionText(lang),
		lang === "zh-CN" ? undefined : loadCollectionText("zh-CN"),
	]);
	const chapters = chapterNav(fileItems(index), lang, m.collection);
	if (!chapters.length) return undefined;
	return {
		chapters,
		...searchCollection(index, text, original, q, OTHER_CHAPTER),
	};
}

export async function buildCollection(
	m: Messages,
	locale: Locale,
	lang: CollectionLang,
	asked: string | undefined,
): Promise<CollectionData | undefined> {
	const t = m.collection;
	const [index, text, original, arts, hidden, storyGroups, link] =
		await Promise.all([
			loadCollectionIndex(),
			loadCollectionText(lang),
			lang === "zh-CN" ? undefined : loadCollectionText("zh-CN"),
			loadCollectionArt(),
			loadHiddenSong(),
			loadStoryGroups(),
			objectUrls(),
		]);
	const filed = fileItems(index);
	const { chapters, unfiled } = filed;
	if (!chapters.length) return undefined;
	const nav = chapterNav(filed, lang, t);
	const current =
		nav.find((c) => c.id === asked) ??
		nav.find((c) => c.id === DEFAULT_CHAPTER) ??
		nav[0];
	if (!current) return undefined;
	const shown =
		current.id === OTHER_CHAPTER
			? unfiled
			: (chapters.find((c) => c.chapter.id === current.id)?.items ?? []);
	const titleOf = (key: string, sub: number) =>
		entryText(textKey(key, sub), text, original).title || undefined;
	const items: ViewItem[] = shown.map((item) => ({
		key: item.key,
		entries: item.entries.map((entry) => {
			const id = textKey(item.key, entry.sub);
			const e = entryText(id, text, original);
			const { body, author } = e;
			const title = e.title || item.key;
			const placed = arts.get(id);
			return {
				sub: entry.sub,
				title,
				meta: [entry.date, author ? fill(t.author, { name: author }) : ""]
					.filter(Boolean)
					.join(" · "),
				body,
				original: !e.translated && Boolean(body),
				properties: parseProperties(e.properties),
				unlock: describeUnlock(entry, t.unlock, titleOf),
				place: placed && entryPlace(placed, t),
				art: placed && entryArt(placed, title, t, link),
				before: placed && entryBefore(placed, lang, t),
				tile: placed && entryTile(placed, title, t, link),
				hidden:
					hidden && unlocksHiddenSong(entry)
						? {
								href: viewHref("c9s6"),
								label: fill(t.hiddenSong, { name: hidden.name }),
							}
						: undefined,
			};
		}),
	}));
	const story = viewTextGroups(
		storyGroups.filter((group) => group.chapter === current.id),
		locale,
		lang,
		link,
	);
	return { chapters: nav, current, items, story };
}

export async function hiddenSongChapter(
	lang: CollectionLang,
): Promise<Crumb | undefined> {
	const chapter = unlockChapter(await loadCollectionIndex());
	if (!chapter) return undefined;
	const { label, name } = chapterHeading(chapter, lang);
	return { label: label || name, href: collectionHref(chapter.id) };
}

type Param = string | string[] | undefined;

/** The canonical URL and title of a Files page: a chapter, section or timeline tab is a page of its own */
export async function filesPageMeta(
	m: Messages,
	locale: Locale,
	view: FilesView,
	params: Record<string, Param>,
): Promise<PageMetaOpts> {
	if (view === "collection") {
		if (parseParam(params.q)) return { noindex: true };
		const id = parseParam(params.chapter) ?? DEFAULT_CHAPTER;
		const index = await loadCollectionIndex();
		const chapter = index.chapters.find((c) => c.id === id);
		const heading = chapter && chapterHeading(chapter, localeTag(locale));
		const name = heading
			? [heading.label, heading.name].filter(Boolean).join(" ")
			: id === OTHER_CHAPTER && index.items.some((i) => !i.chapter)
				? m.collection.other
				: undefined;
		if (!name) return { path: viewHref(view) };
		return {
			path: id === DEFAULT_CHAPTER ? viewHref(view) : collectionHref(id),
			title: `${name} · ${m.collection.title}`,
		};
	}
	if (view === "texts") {
		const section = parseTextSection(parseParam(params.section));
		if (section === TEXT_SECTIONS[0]) return { path: viewHref(view) };
		return {
			path: textsHref(section),
			title: `${m.texts.sections[section].name} · ${m.texts.title}`,
		};
	}
	if (view === "timeline") {
		const tab = parseTimelineTab(params.tab);
		const kind =
			tab === "setting"
				? TERM_KINDS.find((k) => k === parseParam(params.kind))
				: undefined;
		const page = Math.floor(Number(parseParam(params.p)) - 1);
		return {
			path: timelineHref({
				tab,
				kind,
				page: kind && page > 0 ? page : undefined,
				thread: tab === "timeline" ? parseParam(params.thread) : undefined,
				community: parseParam(params.community) === "1",
			}),
			title:
				tab === "timeline"
					? undefined
					: `${m.timeline.tabs[tab]} · ${m.timeline.title}`,
		};
	}
	return { path: viewHref(view) };
}

/** Every Files page the sitemap lists: the views, each chapter, section and timeline tab */
export async function filesSitemapPaths(): Promise<string[]> {
	const index = await loadCollectionIndex();
	return [
		...NAV_VIEWS.map(viewHref),
		...index.chapters
			.filter((c) => c.id !== DEFAULT_CHAPTER)
			.map((c) => collectionHref(c.id)),
		...(index.items.some((i) => !i.chapter)
			? [collectionHref(OTHER_CHAPTER)]
			: []),
		...TEXT_SECTIONS.slice(1).map((s) => textsHref(s)),
		...TIMELINE_TABS.slice(1).map((tab) => timelineHref({ tab })),
	];
}

function fileName(key: string): string {
	return key.slice(key.lastIndexOf("/") + 1);
}

function cutsceneView(cut: Cutscene, link: ObjectUrl): CutsceneView {
	const url = (key: string | null) => (key && link(key)) || null;
	const image = cut.image && url(cut.image.file);
	const video = cut.video && url(cut.video.file);
	return {
		pages: cut.pages,
		image:
			cut.image && image
				? { page: cut.image.page, entrance: cut.image.entrance, src: image }
				: null,
		video:
			cut.video && video
				? {
						src: video,
						width: cut.video.width,
						height: cut.video.height,
						fadeIn: cut.video.fadeIn,
					}
				: null,
		fade: cut.fadeToWhite,
		sound: {
			bgm: url(cut.sound.bgm),
			image: url(cut.sound.image),
			typing: cut.sound.typing.flatMap((key) => {
				const src = url(key);
				return src ? [src] : [];
			}),
		},
	};
}

export async function buildHiddenSong(): Promise<HiddenSongView | undefined> {
	const song = await loadHiddenSong();
	if (!song) return undefined;
	const listed: [HiddenDownload["id"], string | undefined, boolean][] = [
		["pack", song.pack ?? undefined, true],
		["chart", song.chart?.file, false],
		["music", song.music ?? undefined, true],
		["background", song.background?.file, false],
	];
	const [sizes, link] = await Promise.all([
		objectSizes(listed.flatMap(([, key]) => (key ? [key] : []))),
		objectUrls(),
	]);
	const downloads = listed.flatMap(([id, key, save]): HiddenDownload[] => {
		const url = key && link(key);
		if (!key || !url) return [];
		const size = sizes.get(key);
		return [
			{
				id,
				filename: fileName(key),
				url,
				save,
				...(size ? { size: formatSize(size) } : {}),
			},
		];
	});
	const music = song.music ? link(song.music) : undefined;
	const cutscene = song.cutscene
		? cutsceneView(song.cutscene, link)
		: undefined;
	if (!downloads.length && !cutscene) return undefined;
	return {
		name: song.name,
		level: song.level,
		difficulty: song.difficulty,
		chart: song.chart,
		background: song.background,
		music,
		downloads,
		cutscene,
	};
}

const SIDE_LOADERS: Record<SideTab, () => Promise<readonly unknown[]>> = {
	fools: loadFools,
	removed: loadRemoved,
	history: loadHistory,
};

/** The side trees whose manifest lists anything, each a tab on the files page */
export async function sideTabsInUse(): Promise<SideTab[]> {
	const lists = await Promise.all(
		SIDE_TREES.map((tree) => SIDE_LOADERS[tree.tab]()),
	);
	return SIDE_TREES.flatMap((tree, i) => (lists[i]?.length ? [tree.tab] : []));
}
