import type { Bilingual, Locale } from "@/i18n/config";
import { fill } from "@/phi/lib/card-i18n";
import {
	type CollectionIndex,
	type CollectionText,
	entryText,
	itemAnchor,
	textKey,
} from "./collection";
import { collectionHref, pvHref } from "./files-view";
import { text } from "./parse";
import { textAnchor } from "./texts";

/** Built by the story-timeline tools from the Limbo Wiki; too big to bundle */
export const TIMELINE_KEY = "timeline/index.json";

export const LANES = ["tower", "real", "subspace"] as const;
export type Lane = (typeof LANES)[number];
export const SOURCES = ["game", "official", "community"] as const;
export type Source = (typeof SOURCES)[number];
export const NOTE_EFFECTS = ["supports", "contradicts", "adds"] as const;
export const NOTE_SOURCES = [...SOURCES, "interview"] as const;
export type NoteSource = (typeof NOTE_SOURCES)[number];
export type NoteEffect = (typeof NOTE_EFFECTS)[number];
export const TERM_KINDS = [
	"place",
	"subspace",
	"people",
	"group",
	"person",
	"anomaly",
	"tech",
	"concept",
	"object",
	"work",
	"event",
] as const;
export type TermKind = (typeof TERM_KINDS)[number];

export type GameDate = {
	cal: "tower" | "real";
	year: number;
	month?: number;
	day?: number;
};

/** A date as the game and the wiki write it: `770/03/32`, `773.A.P.??.??`, `72 B.P.`, `-12`, `2091.08.31` */
export function parseDate(raw: string): GameDate | undefined {
	let s = raw.trim();
	let sign = /B\.?\s*P\.?/i.test(s) ? -1 : 1;
	s = s.replace(/\s*\.?\s*[AB]\.?\s*P\.?\s*/gi, "/").replace(/\/+$/, "");
	if (s.startsWith("-")) {
		sign = -1;
		s = s.slice(1);
	}
	const parts = s.split(/[/.]/);
	const [y = "", mo, d] = parts;
	if (parts.length > 3 || !/^\d{1,4}$/.test(y)) return undefined;
	// "01/09/35" is not how the game writes an A.P. year: its calendar is unknown
	if (y.length > 1 && y.startsWith("0")) return undefined;
	const year = sign * Number(y);
	if (!year) return undefined;
	const cal = year >= 1900 ? "real" : "tower";
	const [maxMonth, maxDay] = cal === "real" ? [12, 31] : [13, 35];
	const part = (p: string | undefined, max: number) => {
		if (p === undefined || /^\?+$/.test(p)) return { ok: true };
		const n = /^\d{1,2}$/.test(p) ? Number(p) : 0;
		return n >= 1 && n <= max ? { ok: true, n } : { ok: false };
	};
	const m = part(mo, maxMonth);
	const dd = part(d, maxDay);
	if (!m.ok || !dd.ok || (dd.n && !m.n)) return undefined;
	return {
		cal,
		year,
		...(m.n ? { month: m.n } : {}),
		...(dd.n ? { day: dd.n } : {}),
	};
}

export function dateKey(d: GameDate): number {
	return d.year * 10000 + (d.month ?? 0) * 100 + (d.day ?? 0);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function yearLabel(d: Pick<GameDate, "cal" | "year">): string {
	if (d.cal === "real") return String(d.year);
	return d.year < 0 ? `${-d.year} B.P.` : `${d.year} A.P.`;
}

/** The part under a year heading: `03/32`, `03`, or "" for a bare year */
export function dayLabel(d: GameDate): string {
	if (!d.month) return "";
	return d.day ? `${pad(d.month)}/${pad(d.day)}` : pad(d.month);
}

export function dateLabel(d: GameDate): string {
	const day = dayLabel(d);
	if (d.cal === "real") return day ? `${d.year}/${day}` : String(d.year);
	if (d.year < 0) return day ? `${-d.year} B.P. ${day}` : yearLabel(d);
	return day ? `${d.year}/${day}` : yearLabel(d);
}

const ORIGIN = Date.UTC(2089, 6, 22);
const DAY_MS = 86_400_000;

/** One Tower year passes in one day outside: 72 B.P. is 2089-05-11 and 1 A.P. is 2089-07-22 */
export function towerToReal(year: number): string {
	const days = year > 0 ? year - 1 : year;
	return new Date(ORIGIN + days * DAY_MS).toISOString().slice(0, 10);
}

/** The Tower year a full Limbo-reality date falls on, by the same rule */
export function realToTower(d: GameDate): number | undefined {
	if (d.cal !== "real" || !d.month || !d.day) return undefined;
	const days = Math.floor(
		(Date.UTC(d.year, d.month - 1, d.day) - ORIGIN) / DAY_MS,
	);
	return days >= 0 ? days + 1 : days;
}

export type WikiLink = { title: string; community: boolean };

export type TimelineRef =
	| { kind: "wiki"; title: string; community: boolean }
	| { kind: "entry"; id: string }
	| { kind: "story"; group: string }
	| { kind: "pv"; clip: string };

export type TimelineNote = {
	text: Bilingual;
	effect: NoteEffect;
	source: NoteSource;
	wiki: WikiLink | undefined;
};

export type TimelineEvent = {
	id: string;
	raw: string;
	date: GameDate | undefined;
	lane: Lane;
	world: string | undefined;
	era: string | undefined;
	span: string | undefined;
	source: Source;
	inferred: boolean;
	title: Bilingual;
	summary: Bilingual;
	note: Bilingual | undefined;
	notes: TimelineNote[];
	threads: string[];
	chapters: string[];
	refs: TimelineRef[];
};

export type TimelineEra = {
	id: string;
	from: number;
	to: number;
	name: Bilingual;
	summary: Bilingual;
};

export type TimelineNamed = {
	id: string;
	name: Bilingual;
	summary: Bilingual;
	when: Bilingual | undefined;
	wiki: WikiLink[];
};

export type TimelineChapter = { id: string; span: string; synopsis: Bilingual };

export type TimelineTerm = {
	id: string;
	kind: TermKind;
	name: Bilingual;
	aliases: string[];
	summary: Bilingual;
	source: "official" | "community";
	link: boolean;
	wiki: WikiLink[];
	threads: string[];
	events: string[];
};

export type TimelineData = {
	eras: TimelineEra[];
	threads: TimelineNamed[];
	worlds: TimelineNamed[];
	chapters: TimelineChapter[];
	chapterWorlds: ReadonlyMap<string, string>;
	events: TimelineEvent[];
	terms: TimelineTerm[];
};

function bilingual(v: unknown): Bilingual | undefined {
	const o = v as Partial<Record<Locale, unknown>> | null;
	if (!o || typeof o !== "object") return undefined;
	const zh = text(o.zh).trim();
	const en = text(o.en).trim();
	return zh || en ? { zh: zh || en, en: en || zh } : undefined;
}

function strings(v: unknown): string[] {
	return Array.isArray(v)
		? v.filter((s): s is string => typeof s === "string" && s.length > 0)
		: [];
}

function wikiLink(v: unknown): WikiLink | undefined {
	if (typeof v === "string")
		return v ? { title: v, community: false } : undefined;
	const o = v as Record<string, unknown> | null;
	return o && typeof o.title === "string" && o.title
		? { title: o.title, community: o.community === true }
		: undefined;
}

function wikiLinks(v: unknown): WikiLink[] {
	return Array.isArray(v)
		? v.flatMap((x) => {
				const link = wikiLink(x);
				return link ? [link] : [];
			})
		: [];
}

function refOf(v: unknown): TimelineRef | undefined {
	const o = v as Record<string, unknown> | null;
	if (!o || typeof o !== "object") return undefined;
	if (typeof o.wiki === "string" && o.wiki)
		return { kind: "wiki", title: o.wiki, community: o.community === true };
	if (typeof o.entry === "string" && o.entry.includes("#")) {
		return { kind: "entry", id: o.entry };
	}
	if (typeof o.story === "string" && o.story) {
		return { kind: "story", group: o.story };
	}
	if (typeof o.pv === "string" && o.pv) return { kind: "pv", clip: o.pv };
	return undefined;
}

function named(v: unknown): TimelineNamed | undefined {
	const o = v as Record<string, unknown> | null;
	const name = bilingual(o?.name);
	if (!o || typeof o.id !== "string" || !o.id || !name) return undefined;
	return {
		id: o.id,
		name,
		summary: bilingual(o.summary) ?? { zh: "", en: "" },
		when: bilingual(o.when),
		wiki: wikiLinks(o.wiki),
	};
}

function noteOf(v: unknown): TimelineNote | undefined {
	const o = v as Record<string, unknown> | null;
	const t = bilingual(o?.text);
	if (!o || !t) return undefined;
	return {
		text: t,
		effect: NOTE_EFFECTS.find((e) => e === o.effect) ?? "adds",
		source: NOTE_SOURCES.find((s) => s === o.source) ?? "official",
		wiki: wikiLink(o.wiki),
	};
}

function eventOf(v: unknown): TimelineEvent | undefined {
	const o = v as Record<string, unknown> | null;
	if (!o || typeof o !== "object" || typeof o.id !== "string" || !o.id) {
		return undefined;
	}
	const lane = LANES.find((l) => l === o.lane) ?? "tower";
	const source = SOURCES.find((s) => s === o.source);
	const title = bilingual(o.title);
	const summary = bilingual(o.summary);
	if (!source || !title || !summary) return undefined;
	const raw = text(o.date).trim();
	return {
		id: o.id,
		raw,
		date: raw ? parseDate(raw) : undefined,
		lane,
		world: typeof o.world === "string" && o.world ? o.world : undefined,
		era: typeof o.era === "string" && o.era ? o.era : undefined,
		span: typeof o.span === "string" && o.span ? o.span : undefined,
		source,
		inferred: o.inferred === true,
		title,
		summary,
		note: bilingual(o.note),
		notes: Array.isArray(o.notes)
			? o.notes.flatMap((n) => {
					const note = noteOf(n);
					return note ? [note] : [];
				})
			: [],
		threads: strings(o.threads),
		chapters: strings(o.chapters),
		refs: Array.isArray(o.refs)
			? o.refs.flatMap((r) => {
					const ref = refOf(r);
					return ref ? [ref] : [];
				})
			: [],
	};
}

function termOf(v: unknown): TimelineTerm | undefined {
	const o = v as Record<string, unknown> | null;
	if (!o || typeof o !== "object" || typeof o.id !== "string" || !o.id) {
		return undefined;
	}
	const kind = TERM_KINDS.find((k) => k === o.kind);
	const name = bilingual(o.name);
	const summary = bilingual(o.summary);
	if (!kind || !name || !summary) return undefined;
	return {
		id: o.id,
		kind,
		name,
		aliases: strings(o.aliases),
		summary,
		source: o.source === "community" ? "community" : "official",
		link: o.link !== false,
		wiki: wikiLinks(o.wiki),
		threads: strings(o.threads),
		events: strings(o.events),
	};
}

export function parseTimelineData(raw: unknown): TimelineData | undefined {
	const o = raw as Record<string, unknown> | null;
	if (!o || typeof o !== "object" || o.v !== 1) return undefined;
	const list = <T>(v: unknown, f: (x: unknown) => T | undefined): T[] =>
		Array.isArray(v)
			? v.flatMap((x) => {
					const out = f(x);
					return out ? [out] : [];
				})
			: [];
	const eras = list(o.eras, (v) => {
		const e = named(v);
		const r = v as Record<string, unknown>;
		return e && typeof r.from === "number" && typeof r.to === "number"
			? { id: e.id, name: e.name, summary: e.summary, from: r.from, to: r.to }
			: undefined;
	}).sort((a, b) => a.from - b.from);
	const chapterWorlds = new Map<string, string>();
	if (o.chapterWorlds && typeof o.chapterWorlds === "object") {
		for (const [chapter, world] of Object.entries(o.chapterWorlds)) {
			if (typeof world === "string" && world) chapterWorlds.set(chapter, world);
		}
	}
	return {
		eras,
		threads: list(o.threads, named),
		worlds: list(o.worlds, named),
		chapters: list(o.chapters, (v) => {
			const r = v as Record<string, unknown> | null;
			const synopsis = bilingual(r?.synopsis);
			return r && typeof r.id === "string" && r.id && synopsis
				? { id: r.id, span: text(r.span), synopsis }
				: undefined;
		}),
		chapterWorlds,
		events: list(o.events, eventOf),
		terms: list(o.terms, termOf),
	};
}

/** The era a Tower year falls in: the last one starting at or before it */
export function eraOf(
	eras: readonly TimelineEra[],
	year: number,
): TimelineEra | undefined {
	let found: TimelineEra | undefined;
	for (const era of eras) if (era.from <= year) found = era;
	return found ?? eras[0];
}

const CJK = /[\u3400-\u9fff]/;

function aliasesOf(term: TimelineTerm): string[] {
	const names = [term.name.zh, term.name.en, ...term.aliases];
	return [...new Set(names.map((n) => n.trim()))].filter((n) =>
		CJK.test(n) ? n.length >= 2 : n.length >= 4,
	);
}

function occurrences(haystack: string, needle: string): number[] {
	const out: number[] = [];
	const word = !CJK.test(needle);
	let at = haystack.indexOf(needle);
	while (at >= 0) {
		const before = haystack[at - 1] ?? " ";
		const after = haystack[at + needle.length] ?? " ";
		if (!word || (!/\w/.test(before) && !/\w/.test(after))) out.push(at);
		at = haystack.indexOf(needle, at + needle.length);
	}
	return out;
}

/** The terms an event mentions, longest name first so 林泊现实 wins over 林泊; a term's own name beats another's alias */
export function mentions(
	texts: string[],
	terms: readonly TimelineTerm[],
): string[] {
	const hits: { at: number; end: number; field: number; id: string }[] = [];
	const names = terms
		.flatMap((t) => {
			const own = new Set([t.name.zh.trim(), t.name.en.trim()]);
			return aliasesOf(t).map((name) => ({
				name,
				id: t.id,
				own: own.has(name),
			}));
		})
		.sort(
			(a, b) => b.name.length - a.name.length || Number(b.own) - Number(a.own),
		);
	texts.forEach((haystack, field) => {
		const taken: [number, number][] = [];
		for (const { name, id } of names) {
			for (const at of occurrences(haystack, name)) {
				const end = at + name.length;
				if (taken.some(([a, b]) => at < b && end > a)) continue;
				taken.push([at, end]);
				hits.push({ at, end, field, id });
			}
		}
	});
	hits.sort((a, b) => a.field - b.field || a.at - b.at);
	return [...new Set(hits.map((h) => h.id))];
}

const mentionCache = new WeakMap<TimelineData, Map<string, string[]>>();

function termLinks(data: TimelineData): Map<string, string[]> {
	const cached = mentionCache.get(data);
	if (cached) return cached;
	const out = new Map<string, string[]>();
	const matchable = data.terms.filter((t) => t.link && t.source === "official");
	for (const e of data.events) {
		const found = mentions(
			[e.title.zh, e.summary.zh, e.note?.zh ?? ""],
			matchable,
		);
		const explicit = data.terms
			.filter((t) => t.events.includes(e.id) && !found.includes(t.id))
			.map((t) => t.id);
		out.set(e.id, [...found, ...explicit]);
	}
	mentionCache.set(data, out);
	return out;
}

export type ChapterInfo = { short: string; name: string };
export type StoryInfo = { chapter: string; title: string };

export type TimelineSources = {
	index: CollectionIndex;
	text: CollectionText;
	original: CollectionText | undefined;
	chapters: ReadonlyMap<string, ChapterInfo>;
	stories: ReadonlyMap<string, StoryInfo>;
	clips: ReadonlyMap<string, string>;
};

export type TimelineCopy = {
	realApprox: string;
	towerApprox: string;
	wikiRef: string;
	unknownDate: string;
	otherThread: string;
	realBefore: string;
	realAfter: string;
	unplacedShort: string;
};

export type ViewRef = {
	kind: TimelineRef["kind"];
	label: string;
	href: string;
	external: boolean;
	community: boolean;
};

export type ViewChip = {
	id: string;
	short: string;
	name: string;
	href: string;
};

export type ViewNote = {
	text: string;
	effect: NoteEffect;
	source: NoteSource;
	ref: ViewRef | undefined;
};

export type ViewTermChip = {
	id: string;
	anchor: string;
	name: string;
	kind: TermKind;
	page: number;
};

export type ViewEvent = {
	id: string;
	anchor: string;
	index: number;
	when: string;
	full: string;
	tower: string | undefined;
	title: string;
	summary: string;
	note: string | undefined;
	notes: ViewNote[];
	source: Source;
	inferred: boolean;
	threads: { id: string; name: string }[];
	chapters: ViewChip[];
	terms: ViewTermChip[];
	refs: ViewRef[];
};

export type ViewEntry = {
	id: string;
	title: string;
	href: string;
	chapter: string;
};
export type ViewDay = { when: string; entries: ViewEntry[] };

export type ViewYear = {
	id: string;
	label: string;
	real: string | undefined;
	gap: number | undefined;
	events: ViewEvent[];
	days: ViewDay[];
	entries: number;
};

export type ViewChapterSpan = ViewChip & {
	span: string;
	synopsis: string;
	first: string | undefined;
};

export type ViewThread = {
	id: string;
	name: string;
	summary: string;
	count: number;
	wiki: ViewRef[];
};

export type SectionKind = "before" | "era" | "after" | "world" | "unplaced";

export type ViewSection = {
	id: string;
	kind: SectionKind;
	title: string;
	short: string;
	span: string;
	real: string | undefined;
	summary: string;
	years: ViewYear[];
	from: number;
	to: number;
};

export type ViewMapRow = {
	id: string;
	name: string;
	first: number;
	last: number;
	dots: { i: number; source: Source }[];
};

export type ViewMap = {
	count: number;
	rows: ViewMapRow[];
	links: { i: number; from: number; to: number }[];
};

export type ViewTerm = {
	id: string;
	anchor: string;
	kind: TermKind;
	page: number;
	name: string;
	alt: string | undefined;
	summary: string;
	source: "official" | "community";
	refs: ViewRef[];
	threads: { id: string; name: string }[];
	events: { anchor: string; title: string; when: string }[];
};

export type ViewTermGroup = { kind: TermKind; terms: ViewTerm[] };

/** What an event card's "More" holds; it loads when opened */
export type EventDetails = Pick<ViewEvent, "terms" | "notes" | "refs">;

/** A setting card's event and source lists; they load when opened */
export type TermDetails = Pick<ViewTerm, "events" | "refs">;

/** A thread's events in order, on the threads tab; they load when opened */
export type ThreadDetails = Pick<ViewTerm, "events">;

export function detailsIndex(
	sections: readonly ViewSection[],
	groups: readonly ViewTermGroup[],
) {
	const events = new Map<string, EventDetails>();
	const threads = new Map<string, ThreadDetails>();
	for (const section of sections) {
		for (const year of section.years) {
			for (const e of year.events) {
				events.set(e.id, { terms: e.terms, notes: e.notes, refs: e.refs });
				for (const th of e.threads) {
					const own = threads.get(th.id) ?? { events: [] };
					own.events.push({ anchor: e.anchor, title: e.title, when: e.full });
					threads.set(th.id, own);
				}
			}
		}
	}
	const terms = new Map<string, TermDetails>();
	for (const group of groups) {
		for (const t of group.terms) {
			terms.set(t.id, { events: t.events, refs: t.refs });
		}
	}
	return { events, terms, threads };
}

/** Setting entries per page, so a kind with thousands of fan entries still loads quickly */
export const TERM_PAGE = 200;

export type TimelineOptions = {
	locale: Locale;
	thread: string | undefined;
	community: boolean;
};

export function eventAnchor(id: string): string {
	return `e-${id.replace(/[^A-Za-z0-9_-]+/g, "-")}`;
}

export function termAnchor(id: string): string {
	return `t-${id.replace(/[^A-Za-z0-9_-]+/g, "-")}`;
}

export function wikiHref(title: string): string {
	const query = encodeURIComponent(title.replaceAll(" ", "_"))
		.replaceAll("%3A", ":")
		.replaceAll("%2F", "/")
		.replace(/%[C-F][0-9A-F](?:%[89AB][0-9A-F])+/g, decodeURIComponent);
	return `https://wiki.pigeon-games.com/index.php?title=${query}`;
}

type Placed = {
	date: GameDate | undefined;
	raw: string;
	event?: TimelineEvent;
	entry?: ViewEntry;
};

type Bucket = {
	key: string;
	date: GameDate | undefined;
	raw: string;
	items: Placed[];
};

function itemChapter(index: CollectionIndex): Map<string, string> {
	const out = new Map<string, string>();
	for (const item of index.items)
		if (item.chapter) out.set(item.key, item.chapter);
	return out;
}

/** Years between two year labels on one calendar, minding that there is no year 0 */
function yearsBetween(from: GameDate, to: GameDate): number {
	return to.year - from.year - (from.year < 0 && to.year > 0 ? 1 : 0);
}

export function buildTimeline(
	data: TimelineData,
	src: TimelineSources,
	opts: TimelineOptions,
	copy: TimelineCopy,
): {
	sections: ViewSection[];
	threads: ViewThread[];
	chapters: ViewChapterSpan[];
	map: ViewMap;
	terms: ViewTermGroup[];
} {
	const { locale } = opts;
	const pick = (b: Bilingual) => b[locale] || b.zh;
	const threadName = new Map(data.threads.map((t) => [t.id, pick(t.name)]));
	const chapterOf = itemChapter(src.index);
	const titleOf = (id: string) => {
		const key = id.slice(0, id.lastIndexOf("#"));
		return entryText(id, src.text, src.original).title || key;
	};
	const entryHref = (id: string, chapter: string) =>
		`${collectionHref(chapter)}#${itemAnchor(id.slice(0, id.lastIndexOf("#")))}`;
	const wikiView = (link: WikiLink): ViewRef => ({
		kind: "wiki",
		label: fill(copy.wikiRef, {
			title: link.title.replace(/^(Protected|Phigros):/, ""),
		}),
		href: wikiHref(link.title),
		external: true,
		community: link.community,
	});
	const wikiViews = (links: WikiLink[]) =>
		links.filter((l) => opts.community || !l.community).map(wikiView);

	const refView = (ref: TimelineRef): ViewRef | undefined => {
		switch (ref.kind) {
			case "wiki":
				return opts.community || !ref.community ? wikiView(ref) : undefined;
			case "entry": {
				const chapter = chapterOf.get(ref.id.slice(0, ref.id.lastIndexOf("#")));
				if (!chapter) return undefined;
				return {
					kind: "entry",
					label: titleOf(ref.id),
					href: entryHref(ref.id, chapter),
					external: false,
					community: false,
				};
			}
			case "story": {
				const story = src.stories.get(ref.group);
				if (!story) return undefined;
				return {
					kind: "story",
					label: story.title,
					href: `${collectionHref(story.chapter)}#${textAnchor(ref.group)}`,
					external: false,
					community: false,
				};
			}
			case "pv": {
				const title = src.clips.get(ref.clip);
				return title
					? {
							kind: "pv",
							label: title,
							href: pvHref(ref.clip),
							external: false,
							community: false,
						}
					: undefined;
			}
		}
	};

	const visible = (source: Source) => opts.community || source !== "community";
	const shown = data.events.filter(
		(e) =>
			visible(e.source) && (!opts.thread || e.threads.includes(opts.thread)),
	);
	const counts = new Map<string, number>();
	for (const e of data.events) {
		if (!visible(e.source)) continue;
		for (const t of e.threads) counts.set(t, (counts.get(t) ?? 0) + 1);
	}

	const terms = data.terms.filter((t) => visible(t.source));
	const termById = new Map(terms.map((t) => [t.id, t]));
	const links = termLinks(data);
	const firstEra = data.eras[0];
	const lastEra = data.eras[data.eras.length - 1];

	const eventView = (e: TimelineEvent): ViewEvent => {
		const tower = e.date ? realToTower(e.date) : undefined;
		const when =
			e.span ?? (e.date ? dateLabel(e.date) : e.raw || copy.unknownDate);
		return {
			id: e.id,
			anchor: eventAnchor(e.id),
			index: -1,
			when,
			full: when,
			tower:
				tower !== undefined &&
				firstEra &&
				lastEra &&
				tower >= firstEra.from &&
				tower <= lastEra.to
					? fill(copy.towerApprox, {
							year: yearLabel({ cal: "tower", year: tower }),
						})
					: undefined,
			title: pick(e.title),
			summary: pick(e.summary),
			note: e.note ? pick(e.note) : undefined,
			notes: e.notes
				.filter((n) => n.source !== "community" || opts.community)
				.map((n) => ({
					text: pick(n.text),
					effect: n.effect,
					source: n.source,
					ref: n.wiki ? wikiViews([n.wiki])[0] : undefined,
				})),
			source: e.source,
			inferred: e.inferred,
			threads: e.threads.flatMap((id) => {
				const name = threadName.get(id);
				return name ? [{ id, name }] : [];
			}),
			chapters: e.chapters.flatMap((id) => {
				const info = src.chapters.get(id);
				return info ? [{ id, ...info, href: collectionHref(id) }] : [];
			}),
			terms: (links.get(e.id) ?? []).flatMap((id) => {
				const t = termById.get(id);
				return t
					? [
							{
								id,
								anchor: termAnchor(id),
								name: pick(t.name),
								kind: t.kind,
								page: 0,
							},
						]
					: [];
			}),
			refs: e.refs.flatMap((r, at, all) => {
				const v = refView(r);
				const first = all.findIndex(
					(o) => JSON.stringify(o) === JSON.stringify(r),
				);
				return v && first === at ? [v] : [];
			}),
		};
	};
	const cited = new Set(
		shown.flatMap((e) =>
			e.refs.flatMap((r) => (r.kind === "entry" ? [r.id] : [])),
		),
	);

	const start = firstEra ? towerToReal(firstEra.from) : "2089-05-11";
	const startYear = Number(start.slice(0, 4));
	const isBefore = (d: GameDate) =>
		d.month && d.day
			? `${d.year}-${pad(d.month)}-${pad(d.day)}` < start
			: d.year <= startYear;

	const towerBuckets = new Map<string, Placed[]>();
	const before: Placed[] = [];
	const after: Placed[] = [];
	const worldPlaced = new Map<string, Placed[]>();
	const unplaced: Placed[] = [];
	const put = <K>(map: Map<K, Placed[]>, key: K, p: Placed) => {
		const list = map.get(key) ?? [];
		list.push(p);
		map.set(key, list);
	};
	const place = (p: Placed, lane: Lane, era: string | undefined) => {
		const d = p.date;
		if (d?.cal === "real") (isBefore(d) ? before : after).push(p);
		else if (d && lane !== "real") {
			put(towerBuckets, era ?? eraOf(data.eras, d.year)?.id ?? "", p);
		} else if (!d && era && lane !== "real") put(towerBuckets, era, p);
		else unplaced.push(p);
	};

	for (const e of shown) {
		const p: Placed = { date: e.date, raw: e.raw, event: e };
		if (e.lane === "subspace") put(worldPlaced, e.world ?? "", p);
		else place(p, e.lane, e.era);
	}

	if (!opts.thread) {
		for (const item of src.index.items) {
			if (!item.chapter) continue;
			for (const entry of item.entries) {
				const id = textKey(item.key, entry.sub);
				if (cited.has(id)) continue;
				const view: ViewEntry = {
					id,
					title: titleOf(id),
					href: entryHref(id, item.chapter),
					chapter: src.chapters.get(item.chapter)?.short ?? item.chapter,
				};
				const date = parseDate(entry.date);
				const p: Placed = { date, raw: entry.date, entry: view };
				const world = data.chapterWorlds.get(item.chapter);
				if (world) put(worldPlaced, world, p);
				else place(p, "tower", undefined);
			}
		}
	}

	const yearOf = (b: Bucket, items: Placed[], lane: Lane): ViewYear => {
		const label = !b.date
			? copy.unknownDate
			: lane === "subspace"
				? String(b.date.year)
				: yearLabel(b.date);
		const events = items.flatMap((p) => {
			if (!p.event) return [];
			const view = eventView(p.event);
			return [view.when === label ? { ...view, when: "" } : view];
		});
		const days: ViewDay[] = [];
		for (const p of items) {
			if (!p.entry) continue;
			const when = p.date
				? dayLabel(p.date)
				: p.raw && p.raw !== "-"
					? p.raw
					: copy.unknownDate;
			const last = days[days.length - 1];
			if (last && last.when === when) last.entries.push(p.entry);
			else days.push({ when, entries: [p.entry] });
		}
		return {
			id: `y-${b.key.replace(/[^A-Za-z0-9-]+/g, "-")}`,
			label,
			real:
				lane === "tower" && b.date?.cal === "tower"
					? fill(copy.realApprox, { date: towerToReal(b.date.year) })
					: undefined,
			gap: undefined,
			events,
			days,
			entries: days.reduce((n, d) => n + d.entries.length, 0),
		};
	};

	const byPlace = (x: Placed, y: Placed) => {
		if (x.date && y.date) return dateKey(x.date) - dateKey(y.date);
		if (x.date) return -1;
		if (y.date) return 1;
		return x.raw.localeCompare(y.raw);
	};

	const years = (placed: Placed[], lane: Lane): ViewYear[] => {
		const byYear = new Map<string, Bucket>();
		for (const p of placed) {
			const key = p.date ? `${p.date.cal}-${p.date.year}` : "undated";
			const b = byYear.get(key) ?? { key, date: p.date, raw: p.raw, items: [] };
			b.items.push(p);
			byYear.set(key, b);
		}
		return [...byYear.values()]
			.map((b) => ({ ...b, items: [...b.items].sort(byPlace) }))
			.sort((a, b) => byPlace(a.items[0] as Placed, b.items[0] as Placed))
			.map((b) => ({ ...yearOf(b, b.items, lane), date: b.date }))
			.map(({ date, ...year }, at, all) => {
				const prev = all[at - 1]?.date;
				const gap = prev && date ? yearsBetween(prev, date) : 0;
				return gap > 1 ? { ...year, gap } : year;
			});
	};

	const blank = { span: "", real: undefined, summary: "", from: 0, to: 0 };
	const sections: ViewSection[] = [];
	if (before.length) {
		sections.push({
			...blank,
			id: "reality-before",
			kind: "before",
			title: "",
			short: copy.realBefore,
			years: years(before, "real"),
		});
	}
	for (const era of data.eras) {
		const list = towerBuckets.get(era.id);
		if (!list?.length) continue;
		sections.push({
			...blank,
			id: `era-${era.id}`,
			kind: "era",
			title: pick(era.name),
			short: pick(era.name),
			span: `${yearLabel({ cal: "tower", year: era.from })} – ${yearLabel({ cal: "tower", year: era.to })}`,
			real: fill(copy.realApprox, {
				date: `${towerToReal(era.from)} – ${towerToReal(era.to)}`,
			}),
			summary: pick(era.summary),
			years: years(list, "tower"),
		});
	}
	if (after.length) {
		sections.push({
			...blank,
			id: "reality-after",
			kind: "after",
			title: "",
			short: copy.realAfter,
			years: years(after, "real"),
		});
	}
	for (const world of data.worlds) {
		const list = worldPlaced.get(world.id);
		if (!list?.length) continue;
		const story = list.filter((p) => p.event);
		const entries = list.filter((p) => !p.event).sort(byPlace);
		const year = yearOf(
			{ key: world.id, date: undefined, raw: "", items: [] },
			[...story, ...entries],
			"subspace",
		);
		sections.push({
			...blank,
			id: `world-${world.id}`,
			kind: "world",
			title: pick(world.name),
			short: pick(world.name),
			summary: pick(world.summary),
			years: [
				{
					...year,
					label: world.when ? pick(world.when) : "",
					events: year.events.map((e) => ({ ...e, when: "", inferred: false })),
				},
			],
		});
	}
	if (unplaced.length) {
		const items = [...unplaced].sort(byPlace);
		sections.push({
			...blank,
			id: "unplaced",
			kind: "unplaced",
			title: "",
			short: copy.unplacedShort,
			years: [
				yearOf(
					{ key: "undated", date: undefined, raw: "", items },
					items,
					"real",
				),
			],
		});
	}

	let next = 0;
	const indexed = sections.map((s) => {
		const from = next;
		const out = s.years.map((y) => ({
			...y,
			events: y.events.map((e) => ({ ...e, index: next++ })),
		}));
		return { ...s, years: out, from, to: next - 1 };
	});
	const placedEvents = indexed.flatMap((s) => s.years.flatMap((y) => y.events));

	const rows = new Map<string, ViewMapRow>();
	const mapLinks: ViewMap["links"] = [];
	for (const e of placedEvents) {
		const ids = e.threads.length ? e.threads.map((t) => t.id) : [""];
		for (const id of ids) {
			const row = rows.get(id) ?? {
				id,
				name: id ? (threadName.get(id) ?? id) : copy.otherThread,
				first: e.index,
				last: e.index,
				dots: [],
			};
			row.last = e.index;
			row.dots.push({ i: e.index, source: e.source });
			rows.set(id, row);
		}
	}
	const order = [...rows.values()].sort(
		(a, b) => Number(!a.id) - Number(!b.id) || a.first - b.first,
	);
	const rowAt = new Map(order.map((r, at) => [r.id, at]));
	for (const e of placedEvents) {
		if (e.threads.length < 2) continue;
		const at = e.threads.map((t) => rowAt.get(t.id) ?? 0);
		mapLinks.push({ i: e.index, from: Math.min(...at), to: Math.max(...at) });
	}

	const eventsByTerm = new Map<string, ViewTerm["events"]>();
	for (const e of placedEvents) {
		for (const c of e.terms) {
			const list = eventsByTerm.get(c.id) ?? [];
			list.push({ anchor: e.anchor, title: e.title, when: e.full });
			eventsByTerm.set(c.id, list);
		}
	}
	const pageOf = new Map<string, number>();
	const termGroups: ViewTermGroup[] = TERM_KINDS.flatMap((kind) => {
		const list = terms
			.filter((t) => t.kind === kind)
			.map((t): ViewTerm => {
				const name = pick(t.name);
				const other = locale === "zh" ? t.name.en : t.name.zh;
				return {
					id: t.id,
					anchor: termAnchor(t.id),
					kind,
					page: 0,
					name,
					alt: other && other !== name ? other : undefined,
					summary: pick(t.summary),
					source: t.source,
					refs: wikiViews(t.wiki),
					threads: t.threads.flatMap((id) => {
						const n = threadName.get(id);
						return n ? [{ id, name: n }] : [];
					}),
					events: eventsByTerm.get(t.id) ?? [],
				};
			})
			.sort(
				(a, b) =>
					Number(a.source === "community") - Number(b.source === "community") ||
					b.events.length - a.events.length ||
					a.name.localeCompare(b.name, locale),
			)
			.map((term, at) => {
				const page = Math.floor(at / TERM_PAGE);
				pageOf.set(term.id, page);
				return { ...term, page };
			});
		return list.length ? [{ kind, terms: list }] : [];
	});
	for (const e of placedEvents) {
		for (const c of e.terms) c.page = pageOf.get(c.id) ?? 0;
	}

	const dated = shown
		.filter((e): e is TimelineEvent & { date: GameDate } => Boolean(e.date))
		.sort((a, b) => dateKey(a.date) - dateKey(b.date));
	const firstOf = (c: TimelineChapter) => {
		const begin = parseDate(c.span.split("–")[0] ?? "");
		const hit = dated.find(
			(e) =>
				e.chapters.includes(c.id) &&
				(!begin ||
					(e.date.cal === begin.cal && dateKey(e.date) >= dateKey(begin))),
		);
		return hit ? eventAnchor(hit.id) : undefined;
	};

	return {
		sections: indexed,
		threads: data.threads.flatMap((t) => {
			const count = counts.get(t.id) ?? 0;
			return count
				? [
						{
							id: t.id,
							name: pick(t.name),
							summary: pick(t.summary),
							count,
							wiki: wikiViews(t.wiki),
						},
					]
				: [];
		}),
		chapters: opts.thread
			? []
			: data.chapters.flatMap((c) => {
					const info = src.chapters.get(c.id);
					if (!info) return [];
					return [
						{
							id: c.id,
							...info,
							href: collectionHref(c.id),
							span: c.span,
							synopsis: pick(c.synopsis),
							first: firstOf(c),
						},
					];
				}),
		map: { count: next, rows: order, links: mapLinks },
		terms: termGroups,
	};
}
