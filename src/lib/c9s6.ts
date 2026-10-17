import {
	COLLECTION_LANGS,
	type CollectionChapter,
	type CollectionIndex,
	type CollectionLang,
} from "./collection";
import { nonNegative, positiveInt, v1Body } from "./parse";
import type { UnlockSource } from "./unlock";

export const C9S6_MANIFEST_KEY = "c9s6/index.json";
const C9S6_FLAG = "C9S6Unlocked";

const NAME = "[A-Za-z0-9][A-Za-z0-9._-]*";
const SONG_FILE = new RegExp(`^c9s6/${NAME}\\.(json|ogg|png|pez|mp4)$`);
const ART_JPEG = new RegExp(`^collection-art/${NAME}\\.jpg$`);
const ART_PNG = new RegExp(`^collection-art/${NAME}\\.png$`);

export type NoteCounts = {
	tap: number;
	drag: number;
	hold: number;
	flick: number;
};

export type HiddenChart = {
	file: string;
	lines: number | null;
	bpm: number | null;
	notes: NoteCounts | null;
};

export type HiddenBackground = { file: string; width: number; height: number };

export type CutLine = Record<CollectionLang, string>;
export type CutPage = { lines: CutLine[] };

export type CutImage = {
	page: number;
	entrance: number;
	file: string;
	original: string;
	width: number;
	height: number;
};

export type CutVideo = {
	file: string;
	width: number;
	height: number;
	fps: number;
	frames: number;
	fadeIn: number;
};

export type FadeToWhite = {
	page: number;
	line: number;
	in: number;
	out: number;
	autoNext: boolean;
};

export type CutSound = {
	bgm: string | null;
	image: string | null;
	typing: string[];
};

export type Cutscene = {
	pages: CutPage[];
	image: CutImage | null;
	video: CutVideo | null;
	fadeToWhite: FadeToWhite | null;
	sound: CutSound;
};

export type HiddenSong = {
	name: string;
	level: string;
	difficulty: string;
	chart: HiddenChart | null;
	music: string | null;
	background: HiddenBackground | null;
	pack: string | null;
	cutscene: Cutscene | null;
};

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec | undefined {
	return v && typeof v === "object" && !Array.isArray(v)
		? (v as Rec)
		: undefined;
}

function label(v: unknown, fallback: string): string {
	return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function count(v: unknown): number | undefined {
	return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : undefined;
}

function songFile(v: unknown, ext: string): string | null {
	if (typeof v !== "string") return null;
	const match = SONG_FILE.exec(v);
	return match?.[1] === ext ? v : null;
}

function fileOf(v: unknown, ext: string): string | null {
	return songFile(rec(v)?.file, ext);
}

function notesOf(v: unknown): NoteCounts | null {
	const r = rec(v);
	if (!r) return null;
	const tap = count(r.tap);
	const drag = count(r.drag);
	const hold = count(r.hold);
	const flick = count(r.flick);
	if (tap === undefined || drag === undefined) return null;
	if (hold === undefined || flick === undefined) return null;
	return { tap, drag, hold, flick };
}

function chartOf(v: unknown): HiddenChart | null {
	const r = rec(v);
	const file = songFile(r?.file, "json");
	if (!r || !file) return null;
	const bpm = r.bpm;
	return {
		file,
		lines: positiveInt(r.lines) ?? null,
		bpm:
			typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0 ? bpm : null,
		notes: notesOf(r.notes),
	};
}

function backgroundOf(v: unknown): HiddenBackground | null {
	const r = rec(v);
	const file = songFile(r?.file, "png");
	const width = positiveInt(r?.width);
	const height = positiveInt(r?.height);
	return file && width && height ? { file, width, height } : null;
}

function lineOf(v: unknown): CutLine {
	const r = rec(v);
	const out = {} as CutLine;
	for (const lang of COLLECTION_LANGS) {
		const s = r?.[lang];
		out[lang] = typeof s === "string" ? s : "";
	}
	return out;
}

function pagesOf(v: unknown): CutPage[] {
	if (!Array.isArray(v)) return [];
	return v.map((page) => {
		const lines = rec(page)?.lines;
		return { lines: Array.isArray(lines) ? lines.map(lineOf) : [] };
	});
}

function pageIndex(v: unknown, pages: readonly CutPage[]): number | undefined {
	const n = count(v);
	return n !== undefined && n < pages.length ? n : undefined;
}

function imageOf(v: unknown, pages: readonly CutPage[]): CutImage | null {
	const r = rec(v);
	if (!r) return null;
	const page = pageIndex(r.page, pages);
	const entrance = nonNegative(r.entrance);
	const width = positiveInt(r.width);
	const height = positiveInt(r.height);
	const { file, original } = r;
	if (page === undefined || entrance === undefined) return null;
	if (typeof file !== "string" || !ART_JPEG.test(file)) return null;
	if (typeof original !== "string" || !ART_PNG.test(original)) return null;
	return width && height
		? { page, entrance, file, original, width, height }
		: null;
}

function videoOf(v: unknown): CutVideo | null {
	const r = rec(v);
	const file = songFile(r?.file, "mp4");
	if (!r || !file) return null;
	const width = positiveInt(r.width);
	const height = positiveInt(r.height);
	const frames = positiveInt(r.frames);
	const fadeIn = nonNegative(r.fadeIn);
	const fps = nonNegative(r.fps);
	if (!width || !height || !frames || !fps || fadeIn === undefined) {
		return null;
	}
	return { file, width, height, fps, frames, fadeIn };
}

function fadeOf(v: unknown, pages: readonly CutPage[]): FadeToWhite | null {
	const r = rec(v);
	if (!r) return null;
	const page = pageIndex(r.page, pages);
	const line = count(r.line);
	const fadeIn = nonNegative(r.in);
	const fadeOut = nonNegative(r.out);
	if (page === undefined || line === undefined) return null;
	if (line >= (pages[page]?.lines.length ?? 0)) return null;
	if (fadeIn === undefined || fadeOut === undefined) return null;
	return {
		page,
		line,
		in: fadeIn,
		out: fadeOut,
		autoNext: r.autoNext === true,
	};
}

function soundOf(v: unknown): CutSound {
	const r = rec(v);
	const typing = Array.isArray(r?.typing) ? r.typing : [];
	return {
		bgm: songFile(r?.bgm, "ogg"),
		image: songFile(r?.image, "ogg"),
		typing: typing.flatMap((s) => {
			const file = songFile(s, "ogg");
			return file ? [file] : [];
		}),
	};
}

function cutsceneOf(v: unknown): Cutscene | null {
	const r = rec(v);
	const pages = pagesOf(r?.pages);
	if (!r || !pages.some((p) => p.lines.length)) return null;
	return {
		pages,
		image: imageOf(r.image, pages),
		video: videoOf(r.video),
		fadeToWhite: fadeOf(r.fadeToWhite, pages),
		sound: soundOf(r.sound),
	};
}

export function parseHiddenSong(raw: unknown): HiddenSong | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	return {
		name: label(body.name, "C9S6"),
		level: label(body.level, "?"),
		difficulty: label(body.difficulty, "?"),
		chart: chartOf(body.chart),
		music: fileOf(body.music, "ogg"),
		background: backgroundOf(body.background),
		pack: fileOf(body.pack, "pez"),
		cutscene: cutsceneOf(body.cutscene),
	};
}

export function noteTotal(notes: NoteCounts): number {
	return notes.tap + notes.drag + notes.hold + notes.flick;
}

export function unlocksHiddenSong(entry: UnlockSource): boolean {
	if (entry.type !== 7) return false;
	return (entry.info[0] ?? "")
		.split(",")
		.some((flag) => flag.trim() === C9S6_FLAG);
}

export function unlockChapter(
	index: CollectionIndex,
): CollectionChapter | undefined {
	const item = index.items.find(
		(i) => i.chapter && i.entries.some(unlocksHiddenSong),
	);
	return item ? index.chapters.find((c) => c.id === item.chapter) : undefined;
}
