import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { Messages } from "@/i18n/messages";
import {
	type CollectionLang,
	chapterTip,
	itemAnchor,
	type SearchHit,
	type SearchSnippet,
} from "@/lib/collection";
import { collectionHref, collectionSearchHref } from "@/lib/files-view";
import { fill } from "@/phi/lib/card-i18n";
import type { Crumb } from "./Breadcrumb";
import { CollectionNav, type ViewChapter } from "./CollectionNav";
import { DocHead } from "./DocHead";
import { LangSwitch } from "./LangSwitch";

type Copy = Messages["collection"];

export function CollectionSearchForm({
	q,
	lang,
	t,
}: {
	q?: string;
	lang?: CollectionLang;
	t: Copy;
}) {
	return (
		<search>
			<form className="coll-search" action="/files" method="get">
				<input type="hidden" name="view" value="collection" />
				{lang ? <input type="hidden" name="lang" value={lang} /> : null}
				<label className="sr-only" htmlFor="coll-q">
					{t.searchLabel}
				</label>
				<input
					id="coll-q"
					className="input coll-search-input"
					type="search"
					name="q"
					defaultValue={q}
					placeholder={t.searchPlaceholder}
					maxLength={80}
					autoComplete="off"
					enterKeyHint="search"
				/>
				<button className="btn btn-primary" type="submit">
					<MagnifyingGlass size={16} weight="bold" aria-hidden />
					{t.search}
				</button>
			</form>
		</search>
	);
}

function Snippet({ snippet }: { snippet: SearchSnippet }) {
	return (
		<>
			{snippet.before}
			<mark>{snippet.match}</mark>
			{snippet.after}
		</>
	);
}

export function CollectionResults({
	q,
	hits,
	total,
	chapters,
	crumbs,
	crumbLabel,
	lang,
	siteLang,
	t,
}: {
	q: string;
	hits: SearchHit[];
	total: number;
	chapters: ViewChapter[];
	crumbs: Crumb[];
	crumbLabel: string;
	lang: CollectionLang;
	siteLang: CollectionLang;
	t: Copy;
}) {
	const picked = lang === siteLang ? undefined : lang;
	const chapterOf = new Map(chapters.map((c) => [c.id, c]));
	return (
		<article className="doc" aria-labelledby="doc-title">
			<DocHead
				crumbs={crumbs}
				crumbLabel={crumbLabel}
				title={t.searchTitle}
				status
			>
				{total
					? fill(total === 1 ? t.resultsOne : t.results, { n: total, q })
					: fill(t.noResults, { q })}
			</DocHead>
			<CollectionSearchForm q={q} lang={picked} t={t} />
			<LangSwitch
				lang={lang}
				siteLang={siteLang}
				label={t.textLang}
				href={(each) => collectionSearchHref(q, each)}
			/>
			<CollectionNav chapters={chapters} currentId="" lang={picked} t={t} />
			{hits.length ? (
				<ol className="coll-results" lang={picked}>
					{hits.map((hit) => {
						const chapter = chapterOf.get(hit.chapter);
						return (
							<li key={`${hit.key}#${hit.sub}`}>
								<Link
									className="coll-result-title"
									href={`${collectionHref(hit.chapter, picked)}#${itemAnchor(hit.key)}`}
									prefetch={false}
								>
									{hit.titleMatch ? (
										<Snippet snippet={hit.titleMatch} />
									) : (
										hit.title
									)}
								</Link>
								{chapter ? (
									<p className="coll-result-where">{chapterTip(chapter, "")}</p>
								) : null}
								{hit.snippet ? (
									<p className="coll-result-snippet">
										<Snippet snippet={hit.snippet} />
									</p>
								) : null}
							</li>
						);
					})}
				</ol>
			) : null}
			{total > hits.length ? (
				<p className="asset-note">{fill(t.more, { n: hits.length })}</p>
			) : null}
		</article>
	);
}
