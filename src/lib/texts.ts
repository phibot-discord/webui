import type { Bilingual, Locale } from "@/i18n/config";
import { COLLECTION_LANGS, type CollectionLang, localText } from "./collection";
import { positiveInt, v1Body } from "./parse";

/** phi-unpackd's loading tips: `{ v: 1, langs: { <lang>: [tip, …] } }`, one list per game language */
export const TIPS_KEY = "tips/index.json";
/** phi-specials' game texts: `texts/index.json` lists the sections, `texts/<id>.json` holds one */
export const TEXTS_INDEX_KEY = "texts/index.json";

export type TipLists = ReadonlyMap<CollectionLang, readonly string[]>;
export const NO_TIPS: TipLists = new Map();

/** The Other resources page: the loading tips, the avatars and the About us staff roll */
export const TEXT_SECTIONS = ["tips", "avatars", "credits"] as const;
export type TextSection = (typeof TEXT_SECTIONS)[number];

/** phi-specials' `texts/story.json`: its groups are shown where they belong, not as a section of their own */
export const STORY_KEY = "texts/story.json";
/** The staff roll that scrolls in Settings › About us */
export const CREDITS_GROUP = "level21.StaffList";
export function parseTextSection(raw: string | undefined): TextSection {
	return TEXT_SECTIONS.find((s) => s === raw) ?? "tips";
}

export function parseTips(raw: unknown): TipLists | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!body.langs || typeof body.langs !== "object") return undefined;
	const out = new Map<CollectionLang, string[]>();
	for (const lang of COLLECTION_LANGS) {
		const list = (body.langs as Record<string, unknown>)[lang];
		if (!Array.isArray(list)) continue;
		const tips = list.filter(
			(t): t is string => typeof t === "string" && t.trim().length > 0,
		);
		if (tips.length) out.set(lang, tips);
	}
	return out.size ? out : undefined;
}

/** The list in `lang`, else the Simplified Chinese one, which every version of the game has */
export function tipsIn(
	lists: TipLists,
	lang: CollectionLang,
): { lang: CollectionLang; tips: readonly string[] } | undefined {
	const own = lists.get(lang);
	if (own) return { lang, tips: own };
	const zh = lists.get("zh-CN");
	return zh ? { lang: "zh-CN", tips: zh } : undefined;
}

function bilingual(v: unknown): Bilingual | undefined {
	const o = v as Partial<Record<Locale, unknown>> | null;
	if (!o || typeof o !== "object") return undefined;
	const zh = typeof o.zh === "string" ? o.zh : "";
	const en = typeof o.en === "string" ? o.en : "";
	return zh || en ? { zh: zh || en, en: en || zh } : undefined;
}

/** Where a PV's captions are written out: a group of `texts/story.json` */
export type Transcript = { group: string; chapter: string | undefined };

/** The Collection chapter phi-specials files a story group under */
function chapterOf(v: unknown): string | undefined {
	return typeof v === "string" && v ? v : undefined;
}

export type TextsIndex = { transcripts: ReadonlyMap<string, Transcript> };

export const NO_TEXTS_INDEX: TextsIndex = { transcripts: new Map() };

export function textAnchor(id: string): string {
	return `t-${id.replace(/[^A-Za-z0-9_-]+/g, "-")}`;
}

/** `texts/index.json` names each PV's caption group; the sections it lists are no longer shown */
export function parseTextsIndex(raw: unknown): TextsIndex | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	const transcripts = new Map<string, Transcript>();
	for (const row of Array.isArray(body.pv) ? body.pv : []) {
		const r = row as Record<string, unknown> | null;
		const { clip, group, chapter } = r ?? {};
		if (typeof clip !== "string" || typeof group !== "string" || !group) {
			continue;
		}
		if (!transcripts.has(clip)) {
			transcripts.set(clip, { group, chapter: chapterOf(chapter) });
		}
	}
	return { transcripts };
}

/** A line in some of the game's languages, or one text the game shows as it is (with its language when known) */
export type TextLine =
	| { kind: "langs"; text: Partial<Record<CollectionLang, string>> }
	| { kind: "text"; text: string; lang?: CollectionLang };

export type TextImage = { file: string; width: number; height: number };

export type TextGroup = {
	id: string;
	title: Bilingual;
	note: Bilingual | undefined;
	chapter: string | undefined;
	lines: TextLine[];
	images: TextImage[];
};

function lineOf(v: unknown): TextLine | undefined {
	const o = v as Record<string, unknown> | null;
	if (!o || typeof o !== "object") return undefined;
	if (typeof o.text === "string") {
		const lang = COLLECTION_LANGS.find((l) => l === o.lang);
		return { kind: "text", text: o.text, ...(lang ? { lang } : {}) };
	}
	const text = localText(o);
	return Object.keys(text).length ? { kind: "langs", text } : undefined;
}

function imageOf(v: unknown): TextImage | undefined {
	const o = v as Record<string, unknown> | null;
	const w = positiveInt(o?.width);
	const h = positiveInt(o?.height);
	return typeof o?.file === "string" &&
		/^texts\/images\/[^/]+\.png$/.test(o.file) &&
		w &&
		h
		? { file: o.file, width: w, height: h }
		: undefined;
}

export function parseTextsSection(raw: unknown): TextGroup[] | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!Array.isArray(body.groups)) return undefined;
	const out: TextGroup[] = [];
	for (const row of body.groups) {
		const r = row as Record<string, unknown> | null;
		const title = bilingual(r?.title);
		if (!r || typeof r.id !== "string" || !title) continue;
		const lines = Array.isArray(r.lines)
			? r.lines.flatMap((l) => lineOf(l) ?? [])
			: [];
		const images = Array.isArray(r.images)
			? r.images.flatMap((i) => imageOf(i) ?? [])
			: [];
		if (!lines.length && !images.length) continue;
		out.push({
			id: r.id,
			title,
			note: bilingual(r.note),
			chapter: chapterOf(r.chapter),
			lines,
			images,
		});
	}
	return out;
}

export type ShownLine = { text: string; lang: CollectionLang | undefined };

/** A text group ready to show: its title and note in the site's language, its lines in the picked one */
export type ViewTextGroup = {
	id: string;
	title: string;
	note: string | undefined;
	lines: ShownLine[];
	images: { src: string; width: number; height: number }[];
};

const FALLBACK: CollectionLang[] = ["zh-CN", "en", "zh-TW", "ja", "ko"];

/** The lines to show in `lang`, falling back to Simplified Chinese, then English, then all */
export function linesIn(lines: TextLine[], lang: CollectionLang): ShownLine[] {
	const tagged = lines.filter(
		(l): l is Extract<TextLine, { kind: "text" }> =>
			l.kind === "text" && Boolean(l.lang),
	);
	const pick = [lang, ...FALLBACK].find((l) =>
		tagged.some((t) => t.lang === l),
	);
	return lines.flatMap((line): ShownLine[] => {
		if (line.kind === "langs") {
			const at = [lang, ...FALLBACK].find((l) => line.text[l]);
			return at ? [{ text: line.text[at] ?? "", lang: at }] : [];
		}
		if (!line.lang) return [{ text: line.text, lang: undefined }];
		return line.lang === pick ? [{ text: line.text, lang: line.lang }] : [];
	});
}

/** Display name → its file stem under `html/avatar/` (the ripper names files by addressable key) */
export function parseAvatarFiles(
	raw: unknown,
): Map<string, string> | undefined {
	if (!Array.isArray(raw)) return undefined;
	const files = new Map<string, string>();
	for (const row of raw) {
		if (!row || typeof row !== "object") continue;
		const { name, addressable_key: key } = row as Record<string, unknown>;
		if (typeof name !== "string" || typeof key !== "string") continue;
		const file = key.replace(/^avatar\./, "");
		if (name.trim() && file && !file.includes("/"))
			files.set(name.trim(), file);
	}
	return files.size ? files : undefined;
}

/** Names whose file is spelled differently, for when `avatars.json` does not list them */
const AVATAR_FILE: Readonly<Record<string, string>> = {
	"Cipher : /2&//<|0": "Cipher1",
	"Oblivion: PHIN": "OblivionPHIN",
	"Drop It": "Drop it",
	RIPPER: "ripper",
};

export function avatarFile(
	name: string,
	files: ReadonlyMap<string, string>,
): string {
	return files.get(name) ?? AVATAR_FILE[name] ?? name;
}

export function avatarKey(
	name: string,
	files: ReadonlyMap<string, string>,
): string {
	return `html/avatar/${avatarFile(name, files)}.png`;
}

/** A React key for each item: its text, and how many times that text came before when it repeats */
export function keyed<T>(
	items: readonly T[],
	text: (item: T) => string,
): { key: string; item: T }[] {
	const seen = new Map<string, number>();
	return items.map((item) => {
		const base = text(item);
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		return { key: n ? `${base}\u0000${n}` : base, item };
	});
}
