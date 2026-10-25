import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Messages } from "@/i18n/messages";
import {
	type CollectionLang,
	chapterTip,
	type EntryProperty,
	itemAnchor,
} from "@/lib/collection";
import type { ViewArt, ViewBefore, ViewTile } from "@/lib/collection-art";
import { collectionHref } from "@/lib/files-view";
import type { ViewTextGroup } from "@/lib/texts";
import { fill } from "@/phi/lib/card-i18n";
import type { Crumb } from "./Breadcrumb";
import { CollectionArt } from "./CollectionArt";
import { CollectionNav, type ViewChapter } from "./CollectionNav";
import { CollectionSearchForm } from "./CollectionSearch";
import { CollectionToc, type TocItem } from "./CollectionToc";
import { DocHead } from "./DocHead";
import { FilesSwap } from "./FilesFrame";
import { FilesLink } from "./FilesLink";
import { TextGroups } from "./GameTexts";
import { LangSwitch } from "./LangSwitch";
import { RichText } from "./RichText";

export type ViewEntry = {
	sub: number;
	title: string;
	meta: string;
	body: string;
	original: boolean;
	properties: EntryProperty[];
	unlock: string | undefined;
	place: string | undefined;
	art: ViewArt | undefined;
	before: ViewBefore | undefined;
	tile: ViewTile | undefined;
	hidden: { href: string; label: string } | undefined;
};

export type ViewItem = {
	key: string;
	entries: ViewEntry[];
};

export function tocOf(items: ViewItem[]): TocItem[] {
	return items.flatMap((item) => {
		const first = item.entries[0];
		return first ? [{ id: itemAnchor(item.key), title: first.title }] : [];
	});
}

function CollectionTile({ tile }: { tile: ViewTile }) {
	return (
		<figure className="coll-tile">
			<div className="coll-tile-art">
				{/* biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain */}
				<img
					src={tile.src}
					alt={tile.alt}
					width={tile.width}
					height={tile.height}
					loading="lazy"
					decoding="async"
					draggable={false}
				/>
				{tile.label ? (
					<span className="coll-tile-label" lang="zh-CN">
						{tile.label}
					</span>
				) : null}
			</div>
			<figcaption>{tile.caption}</figcaption>
		</figure>
	);
}

function EntryBody({
	body,
	original,
	t,
}: {
	body: string;
	original: boolean;
	t: Messages["collection"];
}) {
	return (
		<>
			<div className="coll-body" lang={original ? "zh-CN" : undefined}>
				<RichText text={body} />
			</div>
			{original ? <p className="coll-note">{t.untranslated}</p> : null}
		</>
	);
}

function EntryText({
	entry,
	t,
}: {
	entry: ViewEntry;
	t: Messages["collection"];
}) {
	return (
		<>
			{entry.meta ? <p className="coll-meta">{entry.meta}</p> : null}
			{entry.properties.length ? (
				<dl className="coll-props">
					{entry.properties.map((p) => (
						<div key={p.key}>
							<dt>{p.key}</dt>
							<dd>{p.value}</dd>
						</div>
					))}
				</dl>
			) : null}
			{entry.unlock ? (
				<p className="coll-unlock">
					<span className="coll-unlock-label">{t.unlockLabel}</span>
					{entry.unlock}
				</p>
			) : null}
			{entry.place ? (
				<p className="coll-unlock">
					<span className="coll-unlock-label">{t.osMode}</span>
					{entry.place}
				</p>
			) : null}
			{entry.hidden ? (
				<p className="coll-hidden">
					<FilesLink href={entry.hidden.href}>
						{entry.hidden.label}
						<ArrowRight size={14} weight="bold" aria-hidden />
					</FilesLink>
				</p>
			) : null}
			{entry.tile ? <CollectionTile tile={entry.tile} /> : null}
			{entry.body ? (
				<EntryBody body={entry.body} original={entry.original} t={t} />
			) : null}
			{entry.before ? (
				<details className="coll-variant">
					<summary>{entry.before.summary}</summary>
					<EntryBody
						body={entry.before.body}
						original={entry.before.original}
						t={t}
					/>
				</details>
			) : null}
		</>
	);
}

function FirstEntry({
	entry,
	eager,
	t,
}: {
	entry: ViewEntry;
	eager: boolean;
	t: Messages["collection"];
}) {
	if (entry.art?.layout === "side") {
		return (
			<div className="coll-split">
				<CollectionArt art={entry.art} title={entry.title} eager={eager} />
				<div className="coll-split-text">
					<EntryText entry={entry} t={t} />
				</div>
			</div>
		);
	}
	return (
		<>
			{entry.art ? (
				<CollectionArt art={entry.art} title={entry.title} eager={eager} />
			) : null}
			<EntryText entry={entry} t={t} />
		</>
	);
}

function PagerLink({
	chapter,
	direction,
	lang,
	t,
}: {
	chapter: ViewChapter;
	direction: "prev" | "next";
	lang?: string;
	t: Messages["collection"];
}) {
	const back = direction === "prev";
	return (
		<FilesLink
			className={`coll-pager-link coll-pager-${direction}`}
			href={collectionHref(chapter.id, lang)}
			rel={direction}
		>
			<span className="coll-pager-dir">
				{back ? <span aria-hidden="true">‹ </span> : null}
				{back ? t.previous : t.next}
				{back ? null : <span aria-hidden="true"> ›</span>}
			</span>
			<span className="coll-pager-name">{chapterTip(chapter, "")}</span>
		</FilesLink>
	);
}

export function CollectionChapter({
	chapters,
	current,
	items,
	story,
	texts,
	crumbs,
	crumbLabel,
	lang,
	siteLang,
	t,
}: {
	chapters: ViewChapter[];
	current: ViewChapter;
	items: ViewItem[];
	story: ViewTextGroup[];
	texts: Messages["texts"];
	crumbs: Crumb[];
	crumbLabel: string;
	lang: CollectionLang;
	siteLang: CollectionLang;
	t: Messages["collection"];
}) {
	const picked = lang === siteLang ? undefined : lang;
	const at = chapters.findIndex((c) => c.id === current.id);
	const prev = chapters[at - 1];
	const next = chapters[at + 1];
	const lead = items.flatMap((item) => item.entries).find((e) => e.art)?.art;
	return (
		<article className="doc" aria-labelledby="doc-title">
			<DocHead crumbs={crumbs} crumbLabel={crumbLabel} title={current.name}>
				{current.label ? `${current.label} · ` : ""}
				{fill(t.itemCount, { n: items.length })}
			</DocHead>
			<CollectionSearchForm lang={picked} t={t} />
			<LangSwitch
				lang={lang}
				siteLang={siteLang}
				label={t.textLang}
				href={(each) => collectionHref(current.id, each)}
			/>
			<CollectionNav
				chapters={chapters}
				currentId={current.id}
				lang={picked}
				t={t}
			/>
			<FilesSwap>
				<CollectionToc label={t.onThisPage} variant="popover" />
				{items.length ? (
					<div className="doc-body" lang={picked}>
						{items.map((item) => {
							const [first, ...clues] = item.entries;
							if (!first) return null;
							const anchor = itemAnchor(item.key);
							return (
								<section key={item.key} className="coll-item">
									<h2 id={anchor}>
										<a href={`#${anchor}`}>
											{first.title}
											<span className="coll-anchor" aria-hidden="true">
												#
											</span>
										</a>
									</h2>
									<FirstEntry entry={first} eager={first.art === lead} t={t} />
									{clues.length ? (
										<div className="coll-clues">
											<h3>{t.clues}</h3>
											{clues.map((entry) => (
												<details key={entry.sub} className="coll-clue">
													<summary lang={entry.original ? "zh-CN" : undefined}>
														{entry.title}
													</summary>
													{entry.art ? (
														<CollectionArt
															art={entry.art}
															title={entry.title}
															eager={entry.art === lead}
														/>
													) : null}
													<EntryText entry={entry} t={t} />
												</details>
											))}
										</div>
									) : null}
								</section>
							);
						})}
					</div>
				) : (
					<p className="asset-note">{t.empty}</p>
				)}
				{story.length ? <TextGroups groups={story} t={texts} /> : null}
				{prev || next ? (
					<nav className="coll-pager" aria-label={t.pagerLabel}>
						{prev ? (
							<PagerLink chapter={prev} direction="prev" lang={picked} t={t} />
						) : null}
						{next ? (
							<PagerLink chapter={next} direction="next" lang={picked} t={t} />
						) : null}
					</nav>
				) : null}
			</FilesSwap>
		</article>
	);
}
