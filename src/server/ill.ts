import { existsSync as fsExists } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { FOOLS_ILL_DIR, FOOLS_PREFIX, splitFools } from "@/lib/assets";
import { logger } from "./logger";
import { illDir } from "./paths";
import { poolAll } from "./pool";
import { fetchR2Object, r2Config } from "./r2";

const CACHE_ROOT = process.env.PHI_ILL_CACHE?.trim() || "/tmp/phi-web-ill";
const ILL_FETCH_CONCURRENCY = 48;

function pngName(id: string): string {
	return id.replace(/\.0$/, ".png");
}

/** `sp` has only the full jacket, in `SP/`; `fools` is a 4/1 special, whose jackets sit in R2 under `4-1/original_ill/`, locally `<illDir>/4-1/<dir>/` */
export type IllTree = "normal" | "sp" | "fools";

/** `id` is the catalog id, `.0` included. `level` picks the per-difficulty jacket (`ill/IN/<id>.png`) of a song that has one: only the normal tree has them, and the caller checks the song does */
export function songIllPath(
	originalIll: string,
	id: string,
	kind: "common" | "blur" | "low" = "common",
	tree: IllTree = "normal",
	level?: string,
): string {
	const png = pngName(id);
	const dir = kind === "blur" ? "illBlur" : kind === "low" ? "illLow" : "ill";
	if (tree === "fools") return join(originalIll, FOOLS_PREFIX, dir, png);
	if (tree === "sp") return join(originalIll, "SP", png);
	return level
		? join(originalIll, dir, level, png)
		: join(originalIll, dir, png);
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
		const [root, rest] = splitFools(ill);
		const prefix = root ? FOOLS_ILL_DIR : r2Config().prefix;
		return `${root}${prefix ? `${prefix}/` : ""}${rest}`;
	}
	const html = HTML_IMAGE_RE.exec(absPath.replace(/\\/g, "/"))?.[1];
	if (html) return `${r2Config().htmlPrefix}/${html}`;
	return undefined;
}

export function fallbackKeyOf(key: string): string | undefined {
	const { prefix, htmlPrefix } = r2Config();
	// 4/1 specials mirror the tree under `4-1/`, always in FOOLS_ILL_DIR
	const [root, rest] = splitFools(key);
	const dir = root ? FOOLS_ILL_DIR : prefix;
	const base = dir ? `${dir}/` : "";
	const illBase = `${base}ill/`;
	if (rest.startsWith(illBase)) {
		return `${root}${base}illLow/${rest.slice(illBase.length)}`;
	}
	if (root) return undefined;
	const avatarBase = `${htmlPrefix}/avatar/`;
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

/** Temp name + rename, so a concurrent reader never sees a partial file */
async function writeAtomic(dest: string, buf: Buffer) {
	await mkdir(/*turbopackIgnore: true*/ dirname(dest), { recursive: true });
	const tmp = `${dest}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
	await writeFile(/*turbopackIgnore: true*/ tmp, buf);
	await rename(/*turbopackIgnore: true*/ tmp, dest);
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
			if (fsExists(/*turbopackIgnore: true*/ dest))
				return { dest, fetched: false };
			const buf = await fetchBytes(candidate);
			if (!buf) continue;
			await writeAtomic(dest, buf);
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
	if (fetched) {
		logger.ok(
			`assets ${hits}/${wanted.length} (${fetched} fetched) in ${Math.round(performance.now() - started)}ms → ${CACHE_ROOT}`,
		);
	} else if (!hits) logger.warn(`assets miss ${wanted.length}`);
	return mapped;
}
