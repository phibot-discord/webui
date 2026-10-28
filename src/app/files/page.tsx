import type { Metadata } from "next";
import { Suspense } from "react";
import { AssetBrowser } from "@/components/AssetBrowser";
import { Breadcrumb, type Crumb } from "@/components/Breadcrumb";
import { CollectionChapter, tocOf } from "@/components/CollectionChapter";
import { CollectionResults } from "@/components/CollectionSearch";
import {
	CollectionToc,
	type TocItem,
	TocProvider,
} from "@/components/CollectionToc";
import { FilesFrame } from "@/components/FilesFrame";
import { FilesSkeletonBody } from "@/components/FilesSkeleton";
import { FilesViews } from "@/components/FilesViews";
import {
	GameTexts,
	type TextsBody,
	type TextsSectionNav,
} from "@/components/GameTexts";
import { HiddenSong } from "@/components/HiddenSong";
import { Pv } from "@/components/Pv";
import { Timeline, timelineToc } from "@/components/Timeline";
import { type Locale, localeTag } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getMessages } from "@/i18n/server";
import { parseCollectionLang } from "@/lib/collection";
import {
	navView,
	parseParam,
	parseTimelineTab,
	parseView,
	viewHref,
} from "@/lib/files-view";
import {
	avatarKey,
	CREDITS_GROUP,
	parseTextSection,
	TEXT_SECTIONS,
	type TextSection,
	textAnchor,
	tipsIn,
} from "@/lib/texts";
import { TERM_KINDS } from "@/lib/timeline";
import { getInfo } from "@/phi/lib/get-info";
import { objectUrls } from "@/server/asset-links";
import {
	buildCollection,
	buildCollectionSearch,
	buildHiddenSong,
	buildPvGroups,
	filesPageMeta,
	hiddenSongChapter,
	sideTabsInUse,
} from "@/server/files-page";
import { afterFlush } from "@/server/flush";
import { pageMetadata } from "@/server/og-meta";
import { ensureSongInfo } from "@/server/song-info";
import { loadStoryGroups, loadTips, viewTextGroups } from "@/server/texts";
import { buildTimelineView } from "@/server/timeline";

export const dynamic = "force-dynamic";

type Search = Promise<{
	view?: string | string[];
	v?: string | string[];
	chapter?: string | string[];
	lang?: string | string[];
	section?: string | string[];
	q?: string | string[];
	thread?: string | string[];
	community?: string | string[];
	tab?: string | string[];
	kind?: string | string[];
	p?: string | string[];
}>;

type ViewCopy = { title: string; lede: string; unavailable: string };

export async function generateMetadata({
	searchParams,
}: {
	searchParams: Search;
}): Promise<Metadata> {
	const [params, { locale, m }] = await Promise.all([
		searchParams,
		getMessages(),
	]);
	const view = parseView(params.view);
	return pageMetadata(view, await filesPageMeta(m, locale, view, params));
}

export default async function FilesPage({
	searchParams,
}: {
	searchParams: Search;
}) {
	const { locale, m } = await getMessages();
	const params = await searchParams;
	const view = navView(parseView(params.view));
	return (
		<FilesFrame
			nav={<FilesViews view={view} t={m.files} />}
			loading={m.files.loading}
		>
			<Suspense
				fallback={<FilesSkeletonBody view={view} loading={m.files.loading} />}
			>
				<FilesBody params={params} locale={locale} m={m} />
			</Suspense>
		</FilesFrame>
	);
}

async function FilesBody({
	params,
	locale,
	m,
}: {
	params: Awaited<Search>;
	locale: Locale;
	m: Messages;
}) {
	await afterFlush();
	const lang = localeTag(locale);
	const view = parseView(params.view);
	const textLang = parseCollectionLang(parseParam(params.lang)) ?? lang;

	const shell = (main: React.ReactNode, toc?: React.ReactNode) => (
		<div className="files-shell">
			<div className="files-main">{main}</div>
			{toc ? <aside className="files-toc">{toc}</aside> : null}
		</div>
	);
	const crumbs = (...rest: Crumb[]) => [
		{ label: m.files.views.files, href: viewHref("files") },
		...rest,
	];
	const intro = (t: ViewCopy, trail = crumbs({ label: t.title })) => (
		<>
			<Breadcrumb items={trail} label={m.files.breadcrumb} />
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
		</>
	);
	const withToc = (items: TocItem[], main: React.ReactNode) => (
		<TocProvider items={items}>
			{shell(
				main,
				items.length ? (
					<CollectionToc label={m.collection.onThisPage} variant="aside" />
				) : undefined,
			)}
		</TocProvider>
	);
	const unavailable = (t: ViewCopy, trail?: Crumb[]) =>
		shell(
			<>
				{intro(t, trail)}
				<p className="callout" role="status">
					{t.unavailable}
				</p>
			</>,
		);

	if (view === "pv") {
		const groups = await buildPvGroups(m, lang);
		if (!groups.some((g) => g.clips.some((c) => c.available))) {
			return unavailable(m.pv);
		}
		return shell(
			<>
				{intro(m.pv)}
				<Pv
					groups={groups}
					initial={parseParam(params.v)}
					t={{ pv: m.pv, deduction: m.deduction, c9s6: m.c9s6 }}
				/>
			</>,
		);
	}

	if (view === "collection") {
		const q = parseParam(params.q);
		if (q) {
			const found = await buildCollectionSearch(m, textLang, q);
			if (!found) return unavailable(m.collection);
			return shell(
				<CollectionResults
					q={q}
					hits={found.hits}
					total={found.total}
					chapters={found.chapters}
					crumbs={crumbs(
						{ label: m.collection.title, href: viewHref("collection") },
						{ label: m.collection.searchTitle },
					)}
					crumbLabel={m.files.breadcrumb}
					lang={textLang}
					siteLang={lang}
					t={m.collection}
				/>,
			);
		}
		const data = await buildCollection(
			m,
			locale,
			textLang,
			parseParam(params.chapter),
		);
		if (!data) return unavailable(m.collection);
		const { chapters, current, items, story } = data;
		return withToc(
			[
				...tocOf(items),
				...story.map((g) => ({ id: textAnchor(g.id), title: g.title })),
			],
			<CollectionChapter
				chapters={chapters}
				current={current}
				items={items}
				story={story}
				texts={m.texts}
				crumbs={crumbs(
					{ label: m.collection.title, href: viewHref("collection") },
					{ label: current.label || current.name },
				)}
				crumbLabel={m.files.breadcrumb}
				lang={textLang}
				siteLang={lang}
				t={m.collection}
			/>,
		);
	}

	if (view === "texts") {
		const current = parseTextSection(parseParam(params.section));
		const [tips, story, link] = await Promise.all([
			loadTips(),
			loadStoryGroups(),
			objectUrls(),
			ensureSongInfo(),
		]);
		const avatarNames = [...new Set(getInfo.avatarid)];
		const shown = tipsIn(tips, textLang);
		const credits = viewTextGroups(
			story.filter((group) => group.id === CREDITS_GROUP),
			locale,
			textLang,
			link,
		);
		const counts: Record<TextSection, number> = {
			tips: shown?.tips.length ?? 0,
			avatars: avatarNames.length,
			credits: credits.reduce((n, group) => n + group.lines.length, 0),
		};
		const sections = TEXT_SECTIONS.flatMap((id): TextsSectionNav[] =>
			counts[id] || id === current
				? [{ id, name: m.texts.sections[id].name, count: counts[id] }]
				: [],
		);
		const heading = m.texts.sections[current];
		let body: TextsBody | undefined;
		if (current === "tips") {
			body = shown && {
				kind: "list",
				lang: shown.lang,
				fallback: shown.lang !== textLang,
				lines: shown.tips,
			};
		} else if (current === "avatars") {
			const avatars = avatarNames.flatMap((name) => {
				const src = link(avatarKey(name, getInfo.avatarFiles));
				return src ? [{ name, src }] : [];
			});
			body = avatars.length ? { kind: "avatars", avatars } : undefined;
		} else {
			body = credits.length ? { kind: "groups", groups: credits } : undefined;
		}
		const page = (
			<GameTexts
				sections={sections}
				current={current}
				heading={heading}
				body={body}
				lang={textLang}
				siteLang={lang}
				crumbs={crumbs(
					{ label: m.texts.title, href: viewHref("texts") },
					{ label: heading.name },
				)}
				crumbLabel={m.files.breadcrumb}
				tocLabel={m.collection.onThisPage}
				t={m.texts}
			/>
		);
		if (body?.kind !== "groups" || body.groups.length < 2) return shell(page);
		return withToc(
			body.groups.map((g) => ({ id: textAnchor(g.id), title: g.title })),
			page,
		);
	}

	if (view === "timeline") {
		const tab = parseTimelineTab(params.tab);
		const kind = TERM_KINDS.find((k) => k === parseParam(params.kind));
		const data = await buildTimelineView(m, locale, {
			thread: tab === "timeline" ? parseParam(params.thread) : undefined,
			community: parseParam(params.community) === "1",
		});
		if (!data.available) {
			return unavailable(m.timeline, crumbs({ label: m.timeline.title }));
		}
		const terms = data.terms.find((g) => g.kind === kind)?.terms ?? [];
		const asked = Math.floor(Number(parseParam(params.p)) - 1);
		const page = Number.isFinite(asked)
			? Math.min(Math.max(asked, 0), terms[terms.length - 1]?.page ?? 0)
			: 0;
		const body = (
			<Timeline
				tab={tab}
				kind={kind}
				page={page}
				data={data}
				thread={data.thread}
				community={data.community}
				crumbs={crumbs({ label: m.timeline.title })}
				crumbLabel={m.files.breadcrumb}
				tocLabel={m.collection.onThisPage}
				t={m.timeline}
			/>
		);
		return tab === "timeline"
			? shell(body)
			: withToc(timelineToc(tab, data, m.timeline, kind, page), body);
	}

	if (view === "c9s6") {
		const [song, chapter] = await Promise.all([
			buildHiddenSong(),
			hiddenSongChapter(lang),
		]);
		const t = { ...m.c9s6, title: song?.name ?? m.c9s6.title };
		const trail = crumbs(
			{ label: m.collection.title, href: viewHref("collection") },
			...(chapter ? [chapter] : []),
			{ label: t.title },
		);
		if (!song) return unavailable(t, trail);
		return shell(
			<>
				{intro(t, trail)}
				<HiddenSong song={song} t={m.c9s6} />
			</>,
		);
	}

	return shell(<AssetBrowser sides={await sideTabsInUse()} t={m.files} />);
}
