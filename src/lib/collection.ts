import { text, v1Body } from "./parse";
import { parseRichText } from "./richtext";

export const COLLECTION_INDEX_KEY = "collection/index.json";
export const COLLECTION_LANGS = ["zh-CN", "zh-TW", "en", "ja", "ko"] as const;
export type CollectionLang = (typeof COLLECTION_LANGS)[number];

/** Each language in its own script, as a language picker lists them */
export const COLLECTION_LANG_NAMES: Record<CollectionLang, string> = {
	"zh-CN": "简体中文",
	"zh-TW": "繁體中文",
	en: "English",
	ja: "日本語",
	ko: "한국어",
};

/** What a picker shows where the full names do not fit side by side */
export const COLLECTION_LANG_SHORT: Record<CollectionLang, string> = {
	"zh-CN": "简中",
	"zh-TW": "繁中",
	en: "EN",
	ja: "日本語",
	ko: "한국어",
};

export function parseCollectionLang(
	raw: string | undefined,
): CollectionLang | undefined {
	return COLLECTION_LANGS.find((lang) => lang === raw);
}

export type LocalText = Partial<Record<CollectionLang, string>>;

export type CollectionChapter = {
	id: string;
	kind: "ex" | "main" | "side" | "extra";
	name: LocalText;
	label: LocalText | null;
	unlock: string | null;
};

export type CollectionEntry = {
	sub: number;
	date: string;
	type: number;
	info: string[];
};

export type CollectionItem = {
	key: string;
	chapter: string | null;
	entries: CollectionEntry[];
};

export type CollectionIndex = {
	chapters: CollectionChapter[];
	items: CollectionItem[];
};

type CollectionEntryText = {
	title: string;
	author: string;
	body: string;
	properties?: string;
};
export type CollectionText = ReadonlyMap<string, CollectionEntryText>;

export const EMPTY_COLLECTION: CollectionIndex = { chapters: [], items: [] };
export const EMPTY_TEXT: CollectionText = new Map();

const KINDS = ["ex", "main", "side", "extra"] as const;

export function localText(v: unknown): LocalText {
	const out: LocalText = {};
	if (!v || typeof v !== "object") return out;
	for (const lang of COLLECTION_LANGS) {
		const s = (v as Record<string, unknown>)[lang];
		if (typeof s === "string" && s.trim()) out[lang] = s;
	}
	return out;
}

export function parseCollectionIndex(
	raw: unknown,
): CollectionIndex | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!Array.isArray(body.chapters) || !Array.isArray(body.items)) {
		return undefined;
	}
	const chapters: CollectionChapter[] = [];
	for (const row of body.chapters) {
		if (!row || typeof row !== "object") continue;
		const r = row as Record<string, unknown>;
		const kind = KINDS.find((k) => k === r.kind);
		if (typeof r.id !== "string" || !r.id || !kind) continue;
		const name = localText(r.name);
		if (!Object.keys(name).length) continue;
		const label = r.label ? localText(r.label) : null;
		chapters.push({
			id: r.id,
			kind,
			name,
			label: label && Object.keys(label).length ? label : null,
			unlock: typeof r.unlock === "string" && r.unlock ? r.unlock : null,
		});
	}
	const ids = new Set(chapters.map((c) => c.id));
	const items: CollectionItem[] = [];
	for (const row of body.items) {
		if (!row || typeof row !== "object") continue;
		const r = row as Record<string, unknown>;
		if (typeof r.key !== "string" || !r.key || !Array.isArray(r.entries)) {
			continue;
		}
		const entries: CollectionEntry[] = [];
		for (const e of r.entries) {
			if (!e || typeof e !== "object") continue;
			const { sub, date, type, info } = e as Record<string, unknown>;
			if (typeof sub !== "number" || !Number.isInteger(sub)) continue;
			entries.push({
				sub,
				date: text(date),
				type: typeof type === "number" && Number.isInteger(type) ? type : -1,
				info: Array.isArray(info) ? info.map(text).slice(0, 3) : [],
			});
		}
		if (!entries.length) continue;
		items.push({
			key: r.key,
			chapter:
				typeof r.chapter === "string" && ids.has(r.chapter) ? r.chapter : null,
			entries,
		});
	}
	if (!chapters.length) return undefined;
	return { chapters, items };
}

export function parseCollectionText(raw: unknown): CollectionText | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!body.entries || typeof body.entries !== "object") return undefined;
	const out = new Map<string, CollectionEntryText>();
	for (const [id, row] of Object.entries(body.entries)) {
		if (!row || typeof row !== "object") continue;
		const {
			title,
			author,
			body: content,
			properties,
		} = row as Record<string, unknown>;
		out.set(id, {
			title: text(title),
			author: text(author),
			body: text(content),
			...(text(properties).trim() ? { properties: text(properties) } : {}),
		});
	}
	return out;
}

export type EntryProperty = { key: string; value: string };

/** `长度=10min32s;碎数研编号=1874-0-009` → its pairs; a part with no `=` or an empty side is left out */
export function parseProperties(raw: string | undefined): EntryProperty[] {
	if (!raw) return [];
	return raw.split(";").flatMap((part) => {
		const at = part.indexOf("=");
		const key = part.slice(0, at).trim();
		const value = part.slice(at + 1).trim();
		return at > 0 && key && value ? [{ key, value }] : [];
	});
}

export function textKey(key: string, sub: number): string {
	return `${key}#${sub}`;
}

/** `text` in `lang`, else in Simplified Chinese; `lang` says which one came back */
export function pickLocal(
	text: LocalText | null | undefined,
	lang: CollectionLang,
): { text: string; lang: CollectionLang } {
	const own = text?.[lang];
	if (own?.trim()) return { text: own, lang };
	return { text: text?.["zh-CN"] ?? "", lang: "zh-CN" };
}

export function pickText(
	text: LocalText | null | undefined,
	lang: CollectionLang,
): string {
	return pickLocal(text, lang).text;
}

export function chapterHeading(
	chapter: CollectionChapter,
	lang: CollectionLang,
): { label: string; name: string } {
	return {
		label: pickText(chapter.label, lang),
		name: pickText(chapter.name, lang),
	};
}

type FiledChapter = {
	chapter: CollectionChapter;
	items: CollectionItem[];
};

export function fileItems(index: CollectionIndex): {
	chapters: FiledChapter[];
	unfiled: CollectionItem[];
} {
	const by = new Map<string, CollectionItem[]>();
	const unfiled: CollectionItem[] = [];
	for (const item of index.items) {
		if (!item.chapter) {
			unfiled.push(item);
			continue;
		}
		const list = by.get(item.chapter) ?? [];
		list.push(item);
		by.set(item.chapter, list);
	}
	return {
		chapters: index.chapters.map((chapter) => ({
			chapter,
			items: by.get(chapter.id) ?? [],
		})),
		unfiled,
	};
}

const ROMAN: [number, string][] = [
	[10, "X"],
	[9, "IX"],
	[5, "V"],
	[4, "IV"],
	[1, "I"],
];

function roman(n: number): string {
	let out = "";
	let left = n;
	for (const [value, digits] of ROMAN) {
		while (left >= value) {
			out += digits;
			left -= value;
		}
	}
	return out;
}

export function chapterShort(
	chapter: Pick<CollectionChapter, "id" | "kind">,
	extra: string,
): string {
	const n = Number(/(\d+)$/.exec(chapter.id)?.[1] ?? 0);
	switch (chapter.kind) {
		case "ex":
			return "EX";
		case "main":
			return n > 0 && n < 40 ? roman(n) : chapter.id.toUpperCase();
		case "side":
			return n > 0 ? `S${n}` : chapter.id.toUpperCase();
		case "extra":
			return extra;
	}
}

export function itemAnchor(key: string): string {
	return `i-${key}`;
}

export function chapterTip(
	chapter: { label: string; name: string },
	count: string,
): string {
	return [chapter.label, chapter.name, count].filter(Boolean).join(" · ");
}

export function chipName(short: string, tip: string): string {
	return tip.includes(short) ? tip : `${short} · ${tip}`;
}

export const COLLECTION_SEARCH_LIMIT = 100;
const SNIPPET_BEFORE = 24;
const SNIPPET_AFTER = 48;

export type SearchSnippet = { before: string; match: string; after: string };

export type SearchHit = {
	chapter: string;
	key: string;
	sub: number;
	title: string;
	titleMatch: SearchSnippet | null;
	snippet: SearchSnippet | null;
};

/** `text` folded for matching, and for each folded character the index of the character it came from */
function folded(text: string): { text: string; at: number[] } {
	let out = "";
	const at: number[] = [];
	let i = 0;
	for (const ch of text) {
		const f = ch.normalize("NFKC").toLowerCase();
		out += f;
		for (let k = 0; k < f.length; k++) at.push(i);
		i += ch.length;
	}
	return { text: out, at };
}

/** `query` in `text`, matched against `fold` (its folded form); the position map is built only on a match */
function find(
	text: string,
	fold: string,
	query: string,
	before: number,
	after: number,
): SearchSnippet | null {
	const pos = fold.indexOf(query);
	if (pos < 0) return null;
	const f = folded(text);
	const start = f.at[pos] ?? 0;
	const lastAt = f.at[pos + query.length - 1] ?? start;
	const end = lastAt + ((text.codePointAt(lastAt) ?? 0) > 0xffff ? 2 : 1);
	const head = Array.from(text.slice(0, start));
	const tail = Array.from(text.slice(end));
	return {
		before: (head.length > before ? "…" : "") + head.slice(-before).join(""),
		match: text.slice(start, end),
		after: tail.slice(0, after).join("") + (tail.length > after ? "…" : ""),
	};
}

function plain(text: string): string {
	return parseRichText(text)
		.map((segment) => segment.text)
		.join("")
		.replace(/\s+/g, " ")
		.trim();
}

/** An entry's fields in its own language, each falling back to `original` (Simplified Chinese) */
export function entryText(
	id: string,
	text: CollectionText,
	original: CollectionText | undefined,
) {
	const own = text.get(id);
	const fallback = original?.get(id);
	const ownBody = own?.body.trim() ?? "";
	return {
		title: own?.title || fallback?.title || "",
		body: ownBody || fallback?.body.trim() || "",
		translated: Boolean(ownBody),
		author: own?.author || fallback?.author || "",
		properties: own?.properties || fallback?.properties || "",
	};
}

type Searchable = {
	title: string;
	body: string;
	extra: string;
	folds: string[];
};

/** Each loaded text's entries, prepared once: the loaders keep a text for minutes, so searches reuse it */
const searchables = new WeakMap<
	CollectionText,
	{ original: CollectionText | undefined; byId: Map<string, Searchable> }
>();

function searchable(
	id: string,
	key: string,
	text: CollectionText,
	original: CollectionText | undefined,
): Searchable {
	let cache = searchables.get(text);
	if (!cache || cache.original !== original) {
		cache = { original, byId: new Map() };
		searchables.set(text, cache);
	}
	let got = cache.byId.get(id);
	if (!got) {
		const e = entryText(id, text, original);
		const title = e.title || key;
		const body = plain(e.body);
		const extra = [e.author, e.properties].filter(Boolean).join(" · ");
		got = {
			title,
			body,
			extra,
			folds: [title, body, extra].map((t) => folded(t).text),
		};
		cache.byId.set(id, got);
	}
	return got;
}

/** Entries matching `query` (case and width folded) in `lang`, else Simplified Chinese; title matches first */
export function searchCollection(
	index: CollectionIndex,
	text: CollectionText,
	original: CollectionText | undefined,
	query: string,
	other: string,
	limit = COLLECTION_SEARCH_LIMIT,
): { hits: SearchHit[]; total: number } {
	const q = folded(query.trim()).text;
	if (!q) return { hits: [], total: 0 };
	const order = new Map(index.chapters.map((c, n) => [c.id, n]));
	const titled: SearchHit[] = [];
	const bodied: SearchHit[] = [];
	for (const item of index.items) {
		for (const entry of item.entries) {
			const id = textKey(item.key, entry.sub);
			const { title, body, extra, folds } = searchable(
				id,
				item.key,
				text,
				original,
			);
			const [inTitle = "", inBody = "", inExtra = ""] = folds;
			const titleMatch = find(title, inTitle, q, 1000, 1000);
			const snippet =
				find(body, inBody, q, SNIPPET_BEFORE, SNIPPET_AFTER) ??
				find(extra, inExtra, q, SNIPPET_BEFORE, SNIPPET_AFTER);
			if (!titleMatch && !snippet) continue;
			const hit = {
				chapter: item.chapter ?? other,
				key: item.key,
				sub: entry.sub,
				title,
				titleMatch,
				snippet,
			};
			(titleMatch ? titled : bodied).push(hit);
		}
	}
	const rank = (h: SearchHit) => order.get(h.chapter) ?? order.size;
	const all = [
		...titled.sort((a, b) => rank(a) - rank(b)),
		...bodied.sort((a, b) => rank(a) - rank(b)),
	];
	return { hits: all.slice(0, limit), total: all.length };
}
