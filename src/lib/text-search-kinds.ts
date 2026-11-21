import type { Locale } from "@/i18n/config";
import {
	type CollectionLang,
	find,
	folded,
	itemAnchor,
	plain,
	type SearchHit,
	type SearchSnippet,
	textKey,
} from "./collection";
import { collectionHref, textsHref, timelineHref } from "./files-view";
import type { TextHit } from "./text-search";
import { linesIn, type TextGroup, textAnchor, tipAnchor } from "./texts";
import type { TermKind, ViewSection, ViewTermGroup } from "./timeline";

export const TEXT_LIMIT = 5;
const BEFORE = 12;
const AFTER = 80;
const WHOLE = 1000;

export type SearchDoc = {
	id: string;
	title: string;
	body: string;
	where: string;
	href: string;
	folds: readonly [string, string];
};

function doc(
	id: string,
	title: string,
	body: string,
	where: string,
	href: string,
): SearchDoc {
	return {
		id,
		title,
		body,
		where,
		href,
		folds: [folded(title).text, folded(body).text],
	};
}

export function searchDocs(
	docs: readonly SearchDoc[],
	query: string,
	limit = TEXT_LIMIT,
): { hits: TextHit[]; total: number } {
	const q = folded(query.trim()).text;
	if (!q) return { hits: [], total: 0 };
	const words = WORDY.test(q);
	const ranks: SearchDoc[][] = [[], [], [], []];
	for (const d of docs) {
		const inTitle = d.folds[0].includes(q);
		if (!inTitle && !d.folds[1].includes(q)) continue;
		const fold = inTitle ? d.folds[0] : d.folds[1];
		const whole = !words || startsWord(fold, q);
		ranks[(inTitle ? 0 : 2) + (whole ? 0 : 1)]?.push(d);
	}
	const all = ranks.flat();
	const hits = all.slice(0, limit).map((d) => ({
		id: d.id,
		title: d.title,
		titleMatch: find(d.title, d.folds[0], q, WHOLE, WHOLE),
		snippet: find(d.body, d.folds[1], q, BEFORE, AFTER),
		where: d.where,
		href: d.href,
	}));
	return { hits, total: all.length };
}

const WORDY = /^[\p{Script=Latin}\p{N}]/u;
const INSIDE = /[\p{L}\p{N}]$/u;

function startsWord(fold: string, q: string): boolean {
	for (let at = fold.indexOf(q); at >= 0; at = fold.indexOf(q, at + 1)) {
		if (!INSIDE.test(fold.slice(Math.max(0, at - 2), at))) return true;
	}
	return false;
}

function telling(snippet: SearchSnippet | null): SearchSnippet | null {
	return snippet && (snippet.before || snippet.after) ? snippet : null;
}

export function tighten(
	snippet: SearchSnippet | null,
	before = BEFORE,
): SearchSnippet | null {
	if (!snippet) return null;
	const head = Array.from(snippet.before.replace(/^…/, ""));
	return head.length > before
		? { ...snippet, before: `…${head.slice(-before).join("")}` }
		: snippet;
}

export function collectionTextHits(
	hits: readonly SearchHit[],
	whereOf: ReadonlyMap<string, string>,
	limit = TEXT_LIMIT,
): TextHit[] {
	return hits.slice(0, limit).map((hit) => ({
		id: textKey(hit.key, hit.sub),
		title: hit.title,
		titleMatch: hit.titleMatch,
		snippet: telling(tighten(hit.snippet)),
		where: whereOf.get(hit.chapter) ?? "",
		href: `${collectionHref(hit.chapter)}#${itemAnchor(hit.key)}`,
	}));
}

export function storyDocs(
	groups: readonly TextGroup[],
	whereOf: ReadonlyMap<string, string>,
	locale: Locale,
	lang: CollectionLang,
): SearchDoc[] {
	return groups.flatMap((group) => {
		const chapter = group.chapter;
		const where = chapter ? whereOf.get(chapter) : undefined;
		if (!chapter || where === undefined) return [];
		const body = linesIn(group.lines, lang)
			.map((line) => plain(line.text))
			.filter(Boolean)
			.join(" ");
		return [
			doc(
				group.id,
				group.title[locale] ?? group.title.en,
				body,
				where,
				`${collectionHref(chapter)}#${textAnchor(group.id)}`,
			),
		];
	});
}

export function tipDocs(tips: readonly string[]): SearchDoc[] {
	return tips.map((tip, n) =>
		doc(
			tipAnchor(n),
			"",
			plain(tip),
			"",
			textsHref("tips", undefined, tipAnchor(n)),
		),
	);
}

export type TimelinePlaces = {
	timeline: string;
	setting: string;
	kinds: Record<TermKind, string>;
};

export function timelineDocs(
	view: { sections: readonly ViewSection[]; terms: readonly ViewTermGroup[] },
	places: TimelinePlaces,
): SearchDoc[] {
	const terms = view.terms.flatMap((group) =>
		group.terms.map((term) =>
			doc(
				`t:${term.id}`,
				term.alt ? `${term.name} · ${term.alt}` : term.name,
				term.summary,
				`${places.setting} · ${places.kinds[term.kind]}`,
				timelineHref(
					{ tab: "setting", kind: term.kind, page: term.page },
					term.anchor,
				),
			),
		),
	);
	const events = view.sections.flatMap((section) =>
		section.years.flatMap((year) =>
			year.events.map((event) =>
				doc(
					`e:${event.id}`,
					event.title,
					[event.summary, event.note].filter(Boolean).join(" "),
					`${places.timeline} · ${event.full}`,
					timelineHref({}, event.anchor),
				),
			),
		),
	);
	return [...terms, ...events];
}
