import type { Messages } from "@/i18n/messages";
import { fill } from "@/phi/lib/card-i18n";
import {
	type CollectionLang,
	type LocalText,
	localText,
	pickLocal,
	textKey,
} from "./collection";
import { positiveInt, v1Body } from "./parse";
import { splitWords } from "./unlock";

export const COLLECTION_ART_KEY = "collection-art/index.json";
/** phi-specials' overlay: the fields only the Chapter 9 passcode or the game's code gives, by entry id */
export const COLLECTION_ART_SPECIALS_KEY = "collection-art/specials.json";

const ART_FILE = /^collection-art\/[^/]+\.jpg$/;
const ART_ORIGINAL = /^collection-art\/[^/]+\.png$/;
const LAYOUTS = ["side", "banner", "text"] as const;

export type ArtLayout = "side" | "banner";

export type CollectionArt = {
	file: string;
	original: string;
	width: number;
	height: number;
};

export type EntryBefore = { flag: string; text: LocalText };

export type ArtTile = {
	file: string;
	width: number;
	height: number;
	label: string;
};

export type ArtEntry = {
	layout: ArtLayout | "text";
	scene: string | null;
	art: CollectionArt | null;
	before: EntryBefore | null;
	tile: ArtTile | null;
};

export type ArtIndex = ReadonlyMap<string, ArtEntry>;

export type ViewArt = {
	src: string;
	full: string;
	width: number;
	height: number;
	layout: ArtLayout;
	alt: string;
	open: string;
	area: string;
};

export type ViewBefore = { summary: string; body: string; original: boolean };

export type ViewTile = {
	src: string;
	width: number;
	height: number;
	label: string;
	alt: string;
	caption: string;
};

type ArtCopy = Pick<
	Messages["collection"],
	| "art"
	| "artOpen"
	| "artArea"
	| "osPhase"
	| "osMap"
	| "before"
	| "tile"
	| "tileAlt"
>;

function artOf(v: unknown): CollectionArt | null {
	if (!v || typeof v !== "object") return null;
	const { file, original, width, height } = v as Record<string, unknown>;
	const w = positiveInt(width);
	const h = positiveInt(height);
	if (typeof file !== "string" || !ART_FILE.test(file)) return null;
	if (typeof original !== "string" || !ART_ORIGINAL.test(original)) {
		return null;
	}
	return w && h ? { file, original, width: w, height: h } : null;
}

function tileOf(v: unknown): ArtTile | null {
	if (!v || typeof v !== "object") return null;
	const { file, width, height, label } = v as Record<string, unknown>;
	const w = positiveInt(width);
	const h = positiveInt(height);
	if (typeof file !== "string" || !ART_ORIGINAL.test(file)) return null;
	if (typeof label !== "string") return null;
	return w && h ? { file, width: w, height: h, label: label.trim() } : null;
}

function beforeOf(v: unknown): EntryBefore | null {
	if (!v || typeof v !== "object") return null;
	const { flag, text } = v as Record<string, unknown>;
	if (typeof flag !== "string" || !flag.trim()) return null;
	const local = localText(text);
	return Object.keys(local).length ? { flag, text: local } : null;
}

export type ArtRow = Record<string, unknown>;

/** A manifest's entries, phi-unpackd's or phi-specials': `{ v: 1, entries: [...] }` */
export function artRows(raw: unknown): ArtRow[] | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!Array.isArray(body.entries)) return undefined;
	return body.entries.filter(
		(row): row is ArtRow =>
			Boolean(row) && typeof row === "object" && !Array.isArray(row),
	);
}

/** Each overlay entry replaces the fields it gives on the entry with the same `id`, or is added as it is */
export function mergeArtRows(
	base: readonly ArtRow[],
	overlay: readonly ArtRow[],
): ArtRow[] {
	const out = base.map((row) => ({ ...row }));
	for (const patch of overlay) {
		if (typeof patch.id !== "string" || !patch.id) continue;
		const target = out.find((row) => row.id === patch.id);
		if (target) Object.assign(target, patch);
		else out.push({ ...patch });
	}
	return out;
}

export function artIndexOf(rows: readonly ArtRow[]): ArtIndex {
	const out = new Map<string, ArtEntry>();
	for (const row of rows) {
		const { key, sub, layout, scene, art, before, tile } = row;
		const kind = LAYOUTS.find((l) => l === layout);
		if (typeof key !== "string" || !key || !kind) continue;
		if (typeof sub !== "number" || !Number.isInteger(sub) || sub < 1) continue;
		const id = textKey(key, sub);
		if (out.has(id)) continue;
		out.set(id, {
			layout: kind,
			scene: typeof scene === "string" && scene ? scene : null,
			art: kind === "text" ? null : artOf(art),
			before: beforeOf(before),
			tile: tileOf(tile),
		});
	}
	return out;
}

export function osPhase(scene: string | null): 1 | 2 | undefined {
	if (scene?.endsWith("/Chapter9SelectMusic.unity")) return 1;
	if (scene?.endsWith("/Chapter9Phase2.unity")) return 2;
	return undefined;
}

export function entryPlace(entry: ArtEntry, t: ArtCopy): string | undefined {
	if (!entry.scene) return undefined;
	const n = osPhase(entry.scene);
	return n ? fill(t.osPhase, { n }) : t.osMap;
}

export function entryArt(
	entry: ArtEntry,
	title: string,
	t: ArtCopy,
	url: (key: string) => string | undefined,
): ViewArt | undefined {
	const { art, layout } = entry;
	if (!art || layout === "text") return undefined;
	const src = url(art.file);
	if (!src) return undefined;
	return {
		src,
		full: url(art.original) ?? src,
		width: art.width,
		height: art.height,
		layout,
		alt: fill(t.art, { title }),
		open: fill(t.artOpen, { title }),
		area: t.artArea,
	};
}

export function entryTile(
	entry: ArtEntry,
	title: string,
	t: ArtCopy,
	url: (key: string) => string | undefined,
): ViewTile | undefined {
	const { tile } = entry;
	const src = tile?.label && url(tile.file);
	if (!tile || !src) return undefined;
	return {
		src,
		width: tile.width,
		height: tile.height,
		label: tile.label,
		alt: fill(t.tileAlt, { title }),
		caption: t.tile,
	};
}

export function flagName(flag: string): string {
	return splitWords(flag.replace(/^C9/, "").replace(/(Unlocked|Reached)$/, ""));
}

export function entryBefore(
	entry: ArtEntry,
	lang: CollectionLang,
	t: ArtCopy,
): ViewBefore | undefined {
	const { before } = entry;
	if (!before) return undefined;
	const picked = pickLocal(before.text, lang);
	const body = picked.text.trim();
	if (!body) return undefined;
	return {
		summary: fill(t.before, { name: flagName(before.flag) }),
		body,
		original: picked.lang !== lang,
	};
}
