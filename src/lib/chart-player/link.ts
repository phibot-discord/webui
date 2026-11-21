import { LEVEL } from "@/phi/lib/const";
import { type Loop, loopOf } from "./loop";

export const PREVIEW_ANCHOR = "song-preview";

export type PreviewLink = {
	rank?: string;
	at?: number;
	loop?: Loop;
	version?: string;
};

type Params = Record<string, string | string[] | undefined>;

const MAX_SECONDS = 36000;
const VERSION_MAX = 80;
const TIME = /^\d+(?:\.\d+)?$/;
const SPAN = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/;

function first(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function seconds(raw: string): number | undefined {
	if (!TIME.test(raw)) return undefined;
	const v = Math.round(Number(raw) * 10) / 10;
	return v <= MAX_SECONDS ? v : undefined;
}

function span(raw: string | undefined): Loop | undefined {
	const m = raw ? SPAN.exec(raw) : null;
	if (!m?.[1] || !m[2]) return undefined;
	const a = seconds(m[1]);
	const b = seconds(m[2]);
	if (a === undefined || b === undefined) return undefined;
	return loopOf(a, b, MAX_SECONDS) ?? undefined;
}

function levelOf(raw: string | undefined): string | undefined {
	const up = raw?.toUpperCase();
	return LEVEL.find((l) => l === up);
}

export function readLink(params: Params): PreviewLink {
	const rank = levelOf(first(params.lv));
	const loop = span(first(params.loop));
	const t = first(params.t);
	const at = loop || t === undefined ? undefined : seconds(t);
	const version = first(params.ver);
	return {
		...(rank ? { rank } : {}),
		...(at !== undefined ? { at } : {}),
		...(loop ? { loop } : {}),
		...(version && version.length <= VERSION_MAX ? { version } : {}),
	};
}

function tenths(v: number): string {
	return String(Math.round(v * 10) / 10);
}

function floorTenth(v: number): number {
	return Math.floor(v * 10 + 1e-6) / 10;
}

function ceilTenth(v: number): number {
	return Math.ceil(v * 10 - 1e-6) / 10;
}

export function linkQuery(link: PreviewLink): string {
	const parts: string[] = [];
	const rank = levelOf(link.rank);
	if (rank) parts.push(`lv=${rank}`);
	const loop = link.loop
		? loopOf(floorTenth(link.loop[0]), ceilTenth(link.loop[1]), MAX_SECONDS)
		: null;
	const at = link.at;
	if (loop) {
		parts.push(`loop=${tenths(loop[0])}-${tenths(loop[1])}`);
	} else if (
		at !== undefined &&
		Number.isFinite(at) &&
		at >= 0.05 &&
		at <= MAX_SECONDS
	) {
		parts.push(`t=${tenths(at)}`);
	}
	if (link.version) parts.push(`ver=${encodeURIComponent(link.version)}`);
	return parts.join("&");
}

export function linkAddress(base: string, link: PreviewLink): string {
	const query = linkQuery(link);
	return `${base}${query ? `?${query}` : ""}#${PREVIEW_ANCHOR}`;
}
