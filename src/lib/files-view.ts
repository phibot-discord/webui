export const FILES_VIEWS = [
	"files",
	"pv",
	"collection",
	"texts",
	"c9s6",
] as const;
export type FilesView = (typeof FILES_VIEWS)[number];

export const NAV_VIEWS = ["files", "pv", "collection", "texts"] as const;
export type NavView = (typeof NAV_VIEWS)[number];

export function navView(view: FilesView): NavView {
	return view === "c9s6" ? "collection" : view;
}

type Param = string | string[] | undefined;

function first(raw: Param): string | undefined {
	return Array.isArray(raw) ? raw[0] : raw;
}

export function parseView(raw: Param): FilesView {
	const view = first(raw);
	return FILES_VIEWS.find((v) => v === view) ?? "files";
}

export function parseParam(raw: Param): string | undefined {
	const value = first(raw)?.trim().slice(0, 80);
	return value || undefined;
}

export function viewHref(view: FilesView): string {
	return view === "files" ? "/files" : `/files?view=${view}`;
}

export function pvHref(clipId: string): string {
	return `/files?view=pv&v=${encodeURIComponent(clipId)}`;
}

/** `lang` is the Collection's text language when the reader picked one; without it the site language is used */
export function collectionHref(chapterId: string, lang?: string): string {
	const href = `/files?view=collection&chapter=${encodeURIComponent(chapterId)}`;
	return lang ? `${href}&lang=${encodeURIComponent(lang)}` : href;
}

/** The Collection's search results for `q`, in `lang` when one is picked */
export function collectionSearchHref(q: string, lang?: string): string {
	const href = `/files?view=collection&q=${encodeURIComponent(q)}`;
	return lang ? `${href}&lang=${encodeURIComponent(lang)}` : href;
}

/** A Game text section; `lang` as for the Collection */
export function textsHref(
	section: string,
	lang?: string,
	anchor?: string,
): string {
	const href = `/files?view=texts&section=${encodeURIComponent(section)}`;
	const withLang = lang ? `${href}&lang=${encodeURIComponent(lang)}` : href;
	return anchor ? `${withLang}#${anchor}` : withLang;
}
