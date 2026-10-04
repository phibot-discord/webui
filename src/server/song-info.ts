import {
	existsSync as fsExists,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getInfo } from "@/phi/lib/get-info";
import {
	INFO_FILE_KV_KEY,
	type InfoFileCache,
	parseInfoFileCache,
} from "@/phi/lib/info-file";
import { applyPhiVersion } from "@/phi/lib/version";
import { runInBackground } from "./background";
import { logger } from "./logger";
import { assetsDir } from "./paths";
import { fetchR2Object, r2Ready } from "./r2";
import { mountBytes } from "./vfs";

export const INFO_STATE_KEY = "_sync/info.json";
const INFO_FILES = [
	"avatar.txt",
	"chaplist.yaml",
	"info.csv",
	"infolist.json",
	"nicklist.yaml",
	"notesInfo.json",
	"spinfo.json",
	"tips.txt",
] as const;

const CACHE_ROOT = process.env.PHI_INFO_CACHE?.trim() || "/tmp/phi-web-info";
const CHECK_MS = 60_000;
const BUNDLED = "bundled";

export type InfoSyncState = {
	commit?: string;
	pending?: number;
	phigros?: string;
	phigrosVerNum?: number;
	levelsSha?: string;
};

export type HydrateResult = {
	commit: string;
	phigros?: string;
	phigrosVerNum?: number;
	levelsSha?: string;
};

type GetObject = (key: string) => Promise<Buffer | undefined>;

type HydrateOpts = {
	getObject: GetObject;
	assetsDir: string;
	cacheRoot: string;
	files?: readonly string[];
	prefix?: string;
};

let gitRevision = BUNDLED;
let levelsSha: string | undefined;
let initedCommit: string | undefined;
let checkedAt = 0;
let inflight: Promise<void> | undefined;

export function catalogRevision(): string {
	return levelsSha ? `${gitRevision}:${levelsSha}` : gitRevision;
}

const reloadListeners = new Set<() => void>();

/** Runs after `getInfo` re-parses a newer catalog (the Discord bot re-indexes song aliases). */
export function onCatalogReload(fn: () => void): void {
	reloadListeners.add(fn);
}

export function resetSongInfoForTest() {
	gitRevision = BUNDLED;
	levelsSha = undefined;
	initedCommit = undefined;
	checkedAt = 0;
	inflight = undefined;
}

function applyRevision(state: {
	commit?: string;
	levelsSha?: string;
	phigros?: string;
	phigrosVerNum?: number;
}): HydrateResult {
	gitRevision = state.commit || BUNDLED;
	if (state.levelsSha) levelsSha = state.levelsSha;
	return {
		commit: gitRevision,
		phigros: state.phigros,
		phigrosVerNum: state.phigrosVerNum,
		levelsSha,
	};
}

function cacheId(state?: InfoSyncState): string {
	if (!state?.commit) return "";
	return `${state.commit}:${state.levelsSha ?? ""}`;
}

export function applyLevelsCsv(
	assets: string,
	cache: InfoFileCache,
	cacheRoot?: string,
) {
	const buf = Buffer.from(cache.csv);
	if (cacheRoot) persistFile(cacheRoot, "info.csv", buf);
	mountInfoFile(assets, "info.csv", buf);
	levelsSha = cache.sha;
}

/** Note counts for the unpacker's csv. The bundled notesInfo predates those songs. */
export function applyNotesInfo(
	assets: string,
	buf: Buffer,
	cacheRoot?: string,
) {
	if (cacheRoot) persistFile(cacheRoot, "notesInfo.json", buf);
	mountInfoFile(assets, "notesInfo.json", buf);
}

function infoPrefix(): string {
	return (process.env.CLOUDFLARE_R2_INFO_PREFIX ?? "info").replace(/\/+$/, "");
}

function parseState(buf: Buffer | undefined): InfoSyncState | undefined {
	if (!buf?.byteLength) return undefined;
	try {
		const parsed = JSON.parse(buf.toString("utf8")) as InfoSyncState;
		if (!parsed || typeof parsed !== "object") return undefined;
		return parsed;
	} catch {
		return undefined;
	}
}

function metaPath(cacheRoot: string): string {
	return join(cacheRoot, "_meta.json");
}

function readCacheMeta(cacheRoot: string): InfoSyncState | undefined {
	try {
		return parseState(
			readFileSync(/*turbopackIgnore: true*/ metaPath(cacheRoot)),
		);
	} catch {
		return undefined;
	}
}

function writeCacheMeta(cacheRoot: string, meta: InfoSyncState) {
	mkdirSync(/*turbopackIgnore: true*/ cacheRoot, { recursive: true });
	writeFileSync(
		/*turbopackIgnore: true*/ metaPath(cacheRoot),
		JSON.stringify(meta),
	);
}

function mountInfoFile(assets: string, name: string, buf: Buffer) {
	mountBytes(join(assets, "info", name), buf);
}

function mountCached(
	assets: string,
	cacheRoot: string,
	files: readonly string[],
): boolean {
	for (const name of files) {
		const dest = join(/*turbopackIgnore: true*/ cacheRoot, name);
		if (!fsExists(/*turbopackIgnore: true*/ dest)) return false;
	}
	for (const name of files) {
		const dest = join(/*turbopackIgnore: true*/ cacheRoot, name);
		mountInfoFile(assets, name, readFileSync(/*turbopackIgnore: true*/ dest));
	}
	return true;
}

function persistFile(cacheRoot: string, name: string, buf: Buffer) {
	mkdirSync(/*turbopackIgnore: true*/ cacheRoot, { recursive: true });
	writeFileSync(/*turbopackIgnore: true*/ join(cacheRoot, name), buf);
}

export async function hydrateSongInfo(
	opts: HydrateOpts,
): Promise<HydrateResult> {
	const files = opts.files ?? INFO_FILES;
	const prefix = (opts.prefix ?? infoPrefix()).replace(/\/+$/, "");
	const state = parseState(await opts.getObject(INFO_STATE_KEY));
	const cached = readCacheMeta(opts.cacheRoot);
	const ready =
		state?.commit && (state.pending == null || state.pending === 0)
			? state
			: undefined;

	if (!ready?.commit) {
		if (cached?.commit && mountCached(opts.assetsDir, opts.cacheRoot, files)) {
			return applyRevision(cached);
		}
		return applyRevision({ commit: BUNDLED });
	}

	if (
		cached &&
		cacheId(cached) === cacheId(ready) &&
		mountCached(opts.assetsDir, opts.cacheRoot, files)
	) {
		return applyRevision({
			commit: ready.commit,
			levelsSha: ready.levelsSha ?? cached.levelsSha,
			phigros: ready.phigros ?? cached.phigros,
			phigrosVerNum: ready.phigrosVerNum ?? cached.phigrosVerNum,
		});
	}

	const downloaded = await Promise.all(
		files.map(async (name) => {
			const buf = await opts.getObject(prefix ? `${prefix}/${name}` : name);
			return { name, buf };
		}),
	);
	for (const { name, buf } of downloaded) {
		if (!buf?.byteLength) continue;
		persistFile(opts.cacheRoot, name, buf);
		mountInfoFile(opts.assetsDir, name, buf);
	}
	writeCacheMeta(opts.cacheRoot, {
		commit: ready.commit,
		phigros: ready.phigros,
		phigrosVerNum: ready.phigrosVerNum,
		levelsSha: ready.levelsSha,
	});
	return applyRevision(ready);
}

async function overlayKvLevels(): Promise<void> {
	try {
		const { getDataHost } = await import("./data-host");
		const { store } = await getDataHost();
		const cache = parseInfoFileCache(await store.get(INFO_FILE_KV_KEY));
		if (!cache) return;
		applyLevelsCsv(assetsDir(), cache, CACHE_ROOT);
		if (!r2Ready()) return;
		const notes = await fetchR2Object(`${infoPrefix()}/notesInfo.json`, {
			cache: "no-store",
		});
		if (notes?.byteLength) applyNotesInfo(assetsDir(), notes, CACHE_ROOT);
	} catch (err) {
		logger.warn(
			`infoFile kv skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
}

async function refresh(): Promise<void> {
	const now = Date.now();
	const skipRemote = initedCommit != null && now - checkedAt < CHECK_MS;
	if (!skipRemote) {
		if (r2Ready()) {
			try {
				const result = await hydrateSongInfo({
					getObject: (key) => fetchR2Object(key, { cache: "no-store" }),
					assetsDir: assetsDir(),
					cacheRoot: CACHE_ROOT,
				});
				if (result.phigros || result.phigrosVerNum != null) {
					applyPhiVersion({
						phigros: result.phigros,
						phigrosVerNum: result.phigrosVerNum,
					});
				}
				const shown = catalogRevision();
				if (result.commit !== BUNDLED && shown !== initedCommit) {
					logger.ok(
						`phi info ${result.commit.slice(0, 8)}${result.phigros ? ` ${result.phigros}` : ""}${result.levelsSha ? ` lv ${result.levelsSha.slice(0, 8)}` : ""}`,
					);
				}
			} catch (err) {
				logger.warn(
					`info hydrate skipped: ${err instanceof Error ? err.message : err}`,
				);
			}
		}
		await overlayKvLevels();
		checkedAt = now;
	}

	const rev = catalogRevision();
	if (initedCommit !== rev) {
		await getInfo.init(assetsDir());
		initedCommit = rev;
		for (const fn of reloadListeners) {
			try {
				fn();
			} catch (err) {
				logger.warn(
					`catalog reload hook failed: ${err instanceof Error ? err.message : err}`,
				);
			}
		}
	}
}

export function ensureSongInfo(): Promise<void> {
	const ready = initedCommit != null;
	if (ready && Date.now() - checkedAt < CHECK_MS) return Promise.resolve();
	if (!inflight) {
		inflight = refresh().finally(() => {
			inflight = undefined;
		});
		if (ready) {
			runInBackground(inflight, (err) =>
				logger.warn(
					`song info refresh failed: ${err instanceof Error ? err.message : err}`,
				),
			);
		}
	}
	return ready ? Promise.resolve() : inflight;
}
