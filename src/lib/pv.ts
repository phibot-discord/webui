import { LEVEL } from "@/phi/lib/const";
import { COLLECTION_LANGS, type CollectionLang } from "./collection";
import { nonNegative, text, v1Body } from "./parse";
import { splitWords } from "./unlock";

export const PV_MANIFEST_KEY = "pv/index.json";
export const PV_VIDEO_PREFIX = "pv/video/";
export const PV_OVERLAY_KEY = "pv/overlay/index.json";
export const PV_OVERLAY_PREFIX = "pv/overlay/";
/** Clips the game does not ship as videos, rendered by hand and listed apart from phi-unpackd's manifest */
export const PV_SPECIALS_KEY = "pv/specials.json";
export const PV_SPECIAL_PREFIX = "pv/special/";

export type OverlayKind = "single" | "lang" | "level";

export type OverlayVersion = { key?: string; file: string; size: number };

export type OverlayIndex = ReadonlyMap<
	string,
	{ kind: OverlayKind; versions: OverlayVersion[]; fixed?: boolean }
>;

export const EMPTY_OVERLAYS: OverlayIndex = new Map();

const OVERLAY_KEYS: Record<OverlayKind, readonly (string | undefined)[]> = {
	single: [undefined],
	lang: COLLECTION_LANGS,
	level: LEVEL,
};

export function parseOverlayIndex(raw: unknown): OverlayIndex | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!body.clips || typeof body.clips !== "object") return undefined;
	const out = new Map<
		string,
		{ kind: OverlayKind; versions: OverlayVersion[] }
	>();
	for (const [id, entry] of Object.entries(body.clips)) {
		const e = entry as { kind?: unknown; variants?: unknown } | null;
		const kind = e?.kind as OverlayKind;
		if (!e || !(kind in OVERLAY_KEYS) || !Array.isArray(e.variants)) continue;
		const versions = e.variants.flatMap((row) => {
			const r = row as Record<string, unknown>;
			const key = typeof r.key === "string" ? r.key : undefined;
			const file = text(r.file);
			const size = nonNegative(r.size);
			if (!OVERLAY_KEYS[kind].includes(key) || !size) return [];
			const name = `${id}${key ? `-${key}` : ""}.mp4`;
			if (file !== `${PV_OVERLAY_PREFIX}${name}`) return [];
			return [{ ...(key ? { key } : {}), file, size }];
		});
		if (versions.length) out.set(id, { kind, versions });
	}
	return out;
}

export type PvClip = {
	id: string;
	name: string;
	group: string;
	scene: string;
	file: string;
	size: number;
	width: number;
	height: number;
	duration: number;
	audio: boolean;
	replay?: string;
};

export function parsePvManifest(raw: unknown): PvClip[] | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!Array.isArray(body.clips)) return undefined;
	const out: PvClip[] = [];
	const seen = new Set<string>();
	for (const row of body.clips) {
		if (!row || typeof row !== "object") continue;
		const r = row as Record<string, unknown>;
		const id = text(r.id);
		const file = text(r.file);
		const size = nonNegative(r.size);
		const width = nonNegative(r.width);
		const height = nonNegative(r.height);
		const duration = nonNegative(r.duration);
		if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || seen.has(id)) continue;
		if (file !== `${PV_VIDEO_PREFIX}${id}.mp4`) continue;
		if (!size || !width || !height || duration === undefined) continue;
		seen.add(id);
		out.push({
			id,
			name: text(r.name) || id,
			group: text(r.group),
			scene: text(r.scene),
			file,
			size,
			width,
			height,
			duration,
			audio: r.audio === true,
		});
	}
	return out;
}

export type SpecialVersion = {
	lang: CollectionLang;
	file: string;
	size: number;
	duration: number;
};

export type PvSpecial = {
	clip: PvClip;
	before: string | undefined;
	versions: SpecialVersion[];
};

function versionsOf(id: string, raw: unknown): SpecialVersion[] {
	if (!Array.isArray(raw)) return [];
	const out: SpecialVersion[] = [];
	for (const row of raw) {
		const r = row as Record<string, unknown> | null;
		const lang = COLLECTION_LANGS.find((l) => l === r?.lang);
		const file = text(r?.file);
		const size = nonNegative(r?.size);
		const duration = nonNegative(r?.duration);
		if (!lang || out.some((v) => v.lang === lang)) continue;
		if (file !== `${PV_SPECIAL_PREFIX}${id}-${lang}.mp4`) continue;
		if (!size || duration === undefined) continue;
		out.push({ lang, file, size, duration });
	}
	return out;
}

/** `pv/specials.json`: clips rendered by hand, one MP4 per game language, each placed before a clip it names */
export function parsePvSpecials(raw: unknown): PvSpecial[] | undefined {
	const body = v1Body(raw);
	if (!body) return undefined;
	if (!Array.isArray(body.clips)) return undefined;
	const out: PvSpecial[] = [];
	for (const row of body.clips) {
		if (!row || typeof row !== "object") continue;
		const r = row as Record<string, unknown>;
		const id = text(r.id);
		const width = nonNegative(r.width);
		const height = nonNegative(r.height);
		if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) continue;
		if (out.some((s) => s.clip.id === id)) continue;
		const versions = versionsOf(id, r.versions);
		const first = versions[0];
		if (!first || !width || !height) continue;
		const replay = text(r.replay);
		out.push({
			clip: {
				id,
				name: text(r.name) || id,
				group: text(r.group),
				scene: text(r.scene),
				file: first.file,
				size: first.size,
				width,
				height,
				duration: first.duration,
				audio: r.audio === true,
				...(/^[a-z0-9-]+$/.test(replay) ? { replay } : {}),
			},
			before: text(r.before) || undefined,
			versions,
		});
	}
	return out;
}

/** Each special goes before the clip it names (at the end when that clip is not listed); an id already listed wins */
/** A hand-rendered clip's MP4s, one per game language, stand in for its overlays and cannot be turned off */
export function withSpecialOverlays(
	index: OverlayIndex,
	specials: readonly PvSpecial[],
): OverlayIndex {
	const out = new Map(index);
	for (const { clip, versions } of specials) {
		if (!versions.length) continue;
		out.set(clip.id, {
			kind: "lang",
			versions: versions.map((v) => ({
				key: v.lang,
				file: v.file,
				size: v.size,
			})),
			fixed: true,
		});
	}
	return out;
}

export function mergeSpecials(
	clips: readonly PvClip[],
	specials: readonly PvSpecial[],
): PvClip[] {
	const out = [...clips];
	for (const { clip, before } of specials) {
		if (out.some((c) => c.id === clip.id)) continue;
		const at = before ? out.findIndex((c) => c.id === before) : -1;
		if (at >= 0) out.splice(at, 0, clip);
		else out.push(clip);
	}
	return out;
}

export function clipTitle(name: string): string {
	return splitWords(name.replace(/_/g, " "));
}

export function formatDuration(seconds: number): string {
	const total = Math.max(0, Math.round(seconds));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export type ChapterRef = { id: string; unlock: string | null };

// SpasmodicEvent unlocks the chapter flagged `Spasmodic`; ChapterN is chapter cN
export function groupChapter<C extends ChapterRef>(
	group: string,
	chapters: readonly C[],
): C | undefined {
	const own = /^Chapter(\d+)$/.exec(group);
	if (own) return chapters.find((c) => c.id === `c${own[1]}`);
	const event = /^(.+)Event$/.exec(group)?.[1];
	if (!event) return undefined;
	return chapters.find((c) => c.unlock === event);
}

export function groupLabel(group: string): string {
	return group.replace(/Event$/, "");
}

export type PvGroup<C> = {
	group: string;
	chapter: C | undefined;
	clips: PvClip[];
};

function sceneRank(name: string): number {
	const level = /(?<![A-Z])(EZ|HD|IN|AT)$/.exec(name)?.[1];
	if (level) return 1 + (LEVEL as readonly string[]).indexOf(level);
	if (/difficult/i.test(name)) return 5;
	return /loop/i.test(name) ? 6 : 0;
}

export function groupClips<C extends ChapterRef>(
	clips: readonly PvClip[],
	chapters: readonly C[],
): PvGroup<C>[] {
	const firstOf = new Map<string, number>();
	clips.forEach((clip, at) => {
		if (!firstOf.has(clip.scene)) firstOf.set(clip.scene, at);
	});
	const ordered = [...clips].sort(
		(a, b) =>
			(firstOf.get(a.scene) ?? 0) - (firstOf.get(b.scene) ?? 0) ||
			sceneRank(a.name) - sceneRank(b.name),
	);
	const out: PvGroup<C>[] = [];
	for (const clip of ordered) {
		let entry = out.find((g) => g.group === clip.group);
		if (!entry) {
			entry = {
				group: clip.group,
				chapter: groupChapter(clip.group, chapters),
				clips: [],
			};
			out.push(entry);
		}
		entry.clips.push(clip);
	}
	return out;
}
