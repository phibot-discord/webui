import { existsSync as fsExists } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	JACKET_TREES,
	type JacketTree,
	SIDE_ILL_DIR,
	sidePrefix,
	splitTree,
} from "@/lib/assets";
import {
	type CacheFiles,
	claimCacheRoot,
	markFileUsed,
	pruneToBudget,
	retryAfterPrune,
} from "@/phi/lib/disk-budget";
import { logger } from "./logger";
import { illDir } from "./paths";
import { poolAll } from "./pool";
import { fetchR2Object, HTML_PREFIX, ILL_PREFIX } from "./r2";

const DEFAULT_CACHE_ROOT = "/tmp/phi-web-ill";
const CACHE_ROOT = process.env.PHI_ILL_CACHE?.trim() || DEFAULT_CACHE_ROOT;
const DEFAULT_ILL_CACHE_MB = 128;
const ILL_PRUNE_GAP_MS = 30_000;
let prunedAt = 0;

export function illCacheBytes(raw: string | undefined): number {
	const mb = Number(raw?.trim());
	return (
		(Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_ILL_CACHE_MB) * 1024 * 1024
	);
}

const ILL_CACHE_BYTES = illCacheBytes(process.env.PHI_ILL_CACHE_MB);

const JACKET_FILES: CacheFiles = {
	setting: "PHI_ILL_CACHE",
	folders: [
		ILL_PREFIX,
		...JACKET_TREES.map((tree) => `${sidePrefix(tree)}/${SIDE_ILL_DIR}`),
		`${HTML_PREFIX}/avatar`,
		`${HTML_PREFIX}/otherimg`,
	],
	nested: true,
	name: /\.png$/,
	marker: ".phi-jacket-cache",
};
let rootClaimed = false;

export function pruneIllCache(
	maxBytes = ILL_CACHE_BYTES,
	now = Date.now(),
): number | undefined | null {
	if (now - prunedAt < ILL_PRUNE_GAP_MS) return null;
	prunedAt = now;
	return pruneToBudget(CACHE_ROOT, maxBytes, JACKET_FILES, now);
}

function pruneNote(left: number | undefined | null): string {
	if (left === null) return "the last prune ran less than 30 s ago";
	if (left === undefined) return "its folder is never pruned";
	return `pruned to ${Math.round(left / 1048576)} MB`;
}

const ILL_FETCH_CONCURRENCY = 48;

/** `sp`: full jacket only, in `SP/`; a jacket tree mirrors the normal layout under its prefix */
export type IllTree = "normal" | "sp" | JacketTree;

/** `stem` is the file name without `.png`; `level` picks a per-difficulty jacket, normal tree only */
export function songIllPath(
	originalIll: string,
	stem: string,
	kind: "common" | "blur" | "low" = "common",
	tree: IllTree = "normal",
	level?: string,
): string {
	const png = `${stem}.png`;
	const dir = kind === "blur" ? "illBlur" : kind === "low" ? "illLow" : "ill";
	if (tree === "sp") return join(originalIll, "SP", png);
	if (tree !== "normal") return join(originalIll, sidePrefix(tree), dir, png);
	return level
		? join(originalIll, dir, level, png)
		: join(originalIll, dir, png);
}

export function illKey(
	stem: string,
	kind: "common" | "low",
	tree: IllTree = "normal",
	level?: string,
): string {
	if (tree !== "normal" && tree !== "sp") {
		return songIllPath(`${sidePrefix(tree)}/${SIDE_ILL_DIR}`, stem, kind);
	}
	return songIllPath(ILL_PREFIX, stem, kind, tree, level);
}

function underIllTree(absPath: string): string | undefined {
	const ill = illDir().replace(/\\/g, "/");
	const n = absPath.replace(/\\/g, "/");
	if (n === ill || n.startsWith(`${ill}/`))
		return n.slice(ill.length).replace(/^\//, "");
	const marker = "/original_ill/";
	const i = n.indexOf(marker);
	if (i >= 0) return n.slice(i + marker.length);
	return undefined;
}

const HTML_IMAGE_RE = /\/html\/((?:avatar|otherimg)\/[^/]+)$/;

function decodeEntities(s: string): string {
	return s.replace(
		/&(amp|#38|#x26|#39|#x27|quot|#34|lt|gt);/gi,
		(_m, e: string) =>
			(
				({
					amp: "&",
					"#38": "&",
					"#x26": "&",
					"#39": "'",
					"#x27": "'",
					quot: '"',
					"#34": '"',
					lt: "<",
					gt: ">",
				}) as Record<string, string>
			)[e.toLowerCase()] ?? _m,
	);
}

export function assetKeyOf(rawPath: string): string | undefined {
	const absPath = decodeEntities(rawPath);
	const ill = underIllTree(absPath);
	if (ill) {
		const [root, rest] = splitTree(ill);
		return `${root}${root ? SIDE_ILL_DIR : ILL_PREFIX}/${rest}`;
	}
	const html = HTML_IMAGE_RE.exec(absPath.replace(/\\/g, "/"))?.[1];
	if (html) return `${HTML_PREFIX}/${html}`;
	return undefined;
}

export function fallbackKeyOf(key: string): string | undefined {
	// The side trees mirror the normal tree under `4-1/` and `removed/`, always in SIDE_ILL_DIR
	const [root, rest] = splitTree(key);
	const base = `${root ? SIDE_ILL_DIR : ILL_PREFIX}/`;
	const illBase = `${base}ill/`;
	if (rest.startsWith(illBase)) {
		return `${root}${base}illLow/${rest.slice(illBase.length)}`;
	}
	if (root) return undefined;
	const avatarBase = `${HTML_PREFIX}/avatar/`;
	const defaultAvatar = `${avatarBase}Introduction.png`;
	if (key.startsWith(avatarBase) && key !== defaultAvatar) return defaultAvatar;
	return undefined;
}

async function fetchBytes(key: string): Promise<Buffer | undefined> {
	const buf = await fetchR2Object(key, { cache: "no-store" });
	if (buf?.byteLength) return buf;
	return undefined;
}

function diskPath(key: string) {
	return join(/*turbopackIgnore: true*/ CACHE_ROOT, key);
}

type Located = { dest: string; fetched: boolean };
const locating = new Map<string, Promise<Located | undefined>>();

async function writeOnce(dest: string, buf: Buffer) {
	await mkdir(/*turbopackIgnore: true*/ dirname(dest), { recursive: true });
	const tmp = `${dest}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
	try {
		await writeFile(/*turbopackIgnore: true*/ tmp, buf);
		await rename(/*turbopackIgnore: true*/ tmp, dest);
	} catch (err) {
		await rm(/*turbopackIgnore: true*/ tmp, { force: true });
		throw err;
	}
}

/** Temp name + rename, so a concurrent reader never sees a partial file */
async function writeAtomic(dest: string, buf: Buffer) {
	if (!rootClaimed) {
		rootClaimed = true;
		claimCacheRoot(CACHE_ROOT, JACKET_FILES, CACHE_ROOT === DEFAULT_CACHE_ROOT);
	}
	await retryAfterPrune(
		() => writeOnce(dest, buf),
		(err) => {
			const left = pruneIllCache(ILL_CACHE_BYTES / 2);
			logger.warn(
				`jacket cache write failed (${err instanceof Error ? err.message : err}), ${pruneNote(left)}`,
			);
		},
	);
}

function locateAsset(key: string): Promise<Located | undefined> {
	const pending = locating.get(key);
	if (pending) return pending;
	const job = (async () => {
		const candidates = [key, fallbackKeyOf(key)].filter((k): k is string =>
			Boolean(k),
		);
		for (const candidate of candidates) {
			const dest = diskPath(candidate);
			if (fsExists(/*turbopackIgnore: true*/ dest)) {
				markFileUsed(dest);
				return { dest, fetched: false };
			}
			const buf = await fetchBytes(candidate);
			if (!buf) continue;
			await writeAtomic(dest, buf);
			markFileUsed(dest);
			return { dest, fetched: true };
		}
		logger.warn(`asset r2 miss ${key}`);
		return undefined;
	})().finally(() => locating.delete(key));
	locating.set(key, job);
	return job;
}

/** One pass over the HTML for all path rewrites (instead of one split/join per jacket) */
export function applyIllPaths(html: string, map: Map<string, string>): string {
	const froms = [...map.keys()].filter((from) => from !== map.get(from));
	if (!froms.length) return html;
	const re = new RegExp(
		froms
			.sort((a, b) => b.length - a.length)
			.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join("|"),
		"g",
	);
	return html.replace(re, (hit) => map.get(hit) ?? hit);
}

export function prefetchIlls(paths: Array<string | undefined>): void {
	const wanted = paths.filter((p): p is string => Boolean(p));
	if (!wanted.length) return;
	void hydrateIlls(wanted).catch(() => undefined);
}

export async function hydrateIlls(
	paths: string[],
	concurrency = ILL_FETCH_CONCURRENCY,
): Promise<Map<string, string>> {
	const mapped = new Map<string, string>();
	const wanted: Array<[path: string, key: string]> = [];
	for (const p of new Set(paths)) {
		const key = p ? assetKeyOf(p) : undefined;
		if (!key) continue;
		// A local copy (git clone of the jackets, bundled icons) wins; R2 only fills what is missing
		const local = decodeEntities(p);
		if (fsExists(local)) {
			if (local !== p) mapped.set(p, local);
			continue;
		}
		wanted.push([p, key]);
	}
	if (!wanted.length) return mapped;
	const started = performance.now();
	let hits = 0;
	let fetched = 0;
	await poolAll(wanted, concurrency, async ([path, key]) => {
		const hit = await locateAsset(key);
		if (!hit) return;
		mapped.set(path, hit.dest);
		hits += 1;
		if (hit.fetched) fetched += 1;
	});
	if (fetched) pruneIllCache();
	if (fetched) {
		logger.ok(
			`assets ${hits}/${wanted.length} (${fetched} fetched) in ${Math.round(performance.now() - started)}ms → ${CACHE_ROOT}`,
		);
	} else if (!hits) logger.warn(`assets miss ${wanted.length}`);
	return mapped;
}
