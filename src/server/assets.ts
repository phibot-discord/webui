import {
	type AssetFile,
	LINKED_PREFIXES,
	PUBLIC_ASSET_PREFIXES,
	readAssetPage,
} from "@/lib/assets";
import { runInBackground } from "./background";
import { cfFetch } from "./cf-fetch";
import { logger } from "./logger";
import {
	bucketObjectsUrl,
	type R2Config,
	r2Config,
	r2WriteReady,
} from "./r2-base";
import { withTimeout } from "./render-lock";

const LIST_TTL_MS = 5 * 60 * 1000;
const LIST_PAGE_CAP = 20;
const LIST_MAX = 8_000;

type Listing = { files: AssetFile[]; byKey: ReadonlyMap<string, AssetFile> };

let cached: (Listing & { at: number }) | undefined;
let listing: Promise<Listing> | undefined;

export async function listAssetPrefix(
	prefix: string,
	cfg: R2Config,
): Promise<AssetFile[]> {
	const files: AssetFile[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < LIST_PAGE_CAP && files.length < LIST_MAX; page++) {
		const url = new URL(bucketObjectsUrl(cfg));
		url.searchParams.set("prefix", prefix);
		url.searchParams.set("per_page", "1000");
		if (cursor) url.searchParams.set("cursor", cursor);
		const res = await cfFetch(url.toString(), {
			headers: { Authorization: `Bearer ${cfg.apiToken}` },
		});
		if (!res.ok) {
			logger.warn(`r2 list ${res.status} ${prefix}`);
			throw new Error(`r2 list ${res.status}`);
		}
		const parsed = readAssetPage(
			await res.json(),
			(key) => key.startsWith(prefix) && key !== prefix,
		);
		files.push(...parsed.files);
		if (!parsed.cursor) return files;
		cursor = parsed.cursor;
	}
	return files;
}

function relist(cfg: R2Config): Promise<Listing> {
	listing ??= Promise.all(
		PUBLIC_ASSET_PREFIXES.map((prefix) => listAssetPrefix(prefix, cfg)),
	)
		.then((groups) => {
			const all = groups.flat().sort((a, b) => a.key.localeCompare(b.key));
			cached = {
				at: Date.now(),
				files: all.slice(0, LIST_MAX),
				byKey: new Map(all.map((file) => [file.key, file])),
			};
			return cached;
		})
		.finally(() => {
			listing = undefined;
		});
	return listing;
}

/** After 5 min the old listing is served while one read refreshes it; `fresh` waits for that read */
function listed(fresh = false): Promise<Listing> {
	if (cached && Date.now() - cached.at < LIST_TTL_MS) {
		return Promise.resolve(cached);
	}
	const cfg = r2Config();
	if (!r2WriteReady(cfg)) return Promise.reject(new Error("r2 unavailable"));
	const job = relist(cfg);
	if (!cached || fresh) return job;
	runInBackground(job, (err) =>
		logger.warn(
			`asset listing kept: ${err instanceof Error ? err.message : err}`,
		),
	);
	return Promise.resolve(cached);
}

/** The public trees for the files page, cut at LIST_MAX; memoised for 5 min */
export function listPublicAssets(): Promise<AssetFile[]> {
	return listed().then((l) => l.files);
}

/** Every listed public file by key, uncut, from the same 5-min listing */
export function publicFiles(): Promise<ReadonlyMap<string, AssetFile>> {
	return listed().then((l) => l.byKey);
}

const VERSIONS_TTL_MS = 30 * 60 * 1000;
/** Key → a short form of its R2 etag, so a link changes exactly when the file does */
let versions = new Map<string, string>();
let versionsAt = 0;
let versionsLoaded = false;
let versionsJob: Promise<void> | undefined;

async function loadVersions(): Promise<void> {
	const cfg = r2Config();
	if (!r2WriteReady(cfg)) return;
	const [current, ...linked] = await Promise.all([
		listed(true),
		...LINKED_PREFIXES.map((prefix) => listAssetPrefix(prefix, cfg)),
	]);
	const next = new Map<string, string>();
	for (const file of [...current.byKey.values(), ...linked.flat()]) {
		if (file.v) next.set(file.key, file.v);
	}
	versions = next;
	versionsAt = Date.now();
	versionsLoaded = true;
}

/** The etag index, refreshed every 30 min in the background; only the first load is awaited */
export function ensureAssetVersions(): Promise<void> {
	if (versionsAt && Date.now() - versionsAt < VERSIONS_TTL_MS) {
		return Promise.resolve();
	}
	if (versionsJob) return versionsLoaded ? Promise.resolve() : versionsJob;
	const job = refreshVersions();
	if (!versionsLoaded) return job;
	runInBackground(job);
	return Promise.resolve();
}

function refreshVersions(): Promise<void> {
	const job = loadVersions()
		.catch((err) => {
			logger.warn(
				`asset versions skipped: ${err instanceof Error ? err.message : err}`,
			);
			versionsAt = Date.now() - VERSIONS_TTL_MS + 60_000;
		})
		.finally(() => {
			if (versionsJob === job) versionsJob = undefined;
		});
	versionsJob = job;
	return job;
}

export function assetVersion(key: string): string | undefined {
	void ensureAssetVersions();
	return versions.get(key);
}

export function setAssetVersionsForTest(map: Map<string, string>) {
	versions = map;
	versionsAt = Date.now();
	versionsLoaded = true;
}

const COLD_WAIT_MS = 2000;
let coldUntil = 0;

/** A cold instance's reads wait for the index together, at most COLD_WAIT_MS in all, so they can use the edge */
export async function versionsSettled(): Promise<void> {
	if (versionsLoaded) return;
	coldUntil ||= Date.now() + COLD_WAIT_MS;
	const left = coldUntil - Date.now();
	if (left <= 0) return;
	await withTimeout(ensureAssetVersions(), left, "asset versions").catch(
		() => undefined,
	);
}
