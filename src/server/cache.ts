import { createHash } from "node:crypto";
import { kvKey } from "@/phi/lib/const";
import { listAssetPrefix } from "./assets";
import { runInBackground } from "./background";
import { parseCachedHeight } from "./card-image-cache";
import type { KvStore } from "./kv";
import { logger } from "./logger";
import { poolAll } from "./pool";
import {
	deleteR2Object,
	putR2Object,
	r2CacheConfig,
	r2WriteReady,
	readPrivateR2Object,
} from "./r2";

const CARD_TTL_MS = 6 * 60 * 60 * 1000;
/** In the private cache bucket (r2CacheConfig), which expires everything 7 days after it is written */
const CARD_R2_PREFIX = "cards";

const pngBufferCache = new Map<string, Buffer>();
const PNG_BUFFER_CACHE_BYTES = 64 * 1024 * 1024;
let pngBufferBytes = 0;
const heightMem = new Map<string, number>();
const HEIGHT_MEM_MAX = 200;

function rememberPng(key: string, bytes: Buffer) {
	const prev = pngBufferCache.get(key);
	if (prev) pngBufferBytes -= prev.byteLength;
	pngBufferCache.delete(key);
	pngBufferCache.set(key, bytes);
	pngBufferBytes += bytes.byteLength;
	while (pngBufferBytes > PNG_BUFFER_CACHE_BYTES && pngBufferCache.size > 1) {
		const oldest = pngBufferCache.keys().next().value;
		if (oldest === undefined) break;
		const evicted = pngBufferCache.get(oldest);
		pngBufferCache.delete(oldest);
		if (evicted) pngBufferBytes -= evicted.byteLength;
	}
}

function rememberHeightMem(id: string, height: number) {
	heightMem.delete(id);
	if (heightMem.size >= HEIGHT_MEM_MAX) {
		const oldest = heightMem.keys().next().value;
		if (oldest !== undefined) heightMem.delete(oldest);
	}
	heightMem.set(id, height);
}

function heightCacheKey(id: string) {
	return kvKey("cardHeight", id);
}

export async function readCachedHeight(
	store: PngStore["store"],
	id: string,
): Promise<number | undefined> {
	const hot = heightMem.get(id);
	if (hot) return hot;
	try {
		const n = parseCachedHeight(await store.get(heightCacheKey(id)));
		if (n) rememberHeightMem(id, n);
		return n;
	} catch (err) {
		logger.warn(
			`height cache read skipped: ${err instanceof Error ? err.message : err}`,
		);
		return undefined;
	}
}

async function persistHeight(
	store: PngStore["store"],
	id: string,
	height: number,
) {
	try {
		await store.set(heightCacheKey(id), String(height), {
			ttlMs: CARD_TTL_MS,
			background: true,
		});
	} catch (err) {
		logger.warn(
			`height cache write skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
}

export async function writeCachedHeight(
	store: PngStore["store"],
	id: string,
	height: number,
): Promise<void> {
	const n = parseCachedHeight(height);
	if (!n) return;
	rememberHeightMem(id, n);
	runInBackground(persistHeight(store, id, n));
}

export function cardEtag(parts: string[]): string {
	return createHash("sha256")
		.update(parts.join("|"))
		.digest("hex")
		.slice(0, 24);
}

export function cacheKey(kind: string, userId: string, etag: string): string {
	return kvKey("webCard", "png", kind, userId, etag);
}

type PngStore = { store: KvStore };

/** One card as R2 files it: `version` changes when it goes stale, `variant` covers what a user picks */
export type CardSlot = {
	userId: string;
	kind: string;
	version: string;
	variant: string;
};

function digest(text: string, hex: number): string {
	return createHash("sha256").update(text).digest("hex").slice(0, hex);
}

function userCardDir(userId: string): string {
	return `${CARD_R2_PREFIX}/${userId.replace(/[^\w-]/g, "_")}/`;
}

/** `cards/<user>/<kind>/<version>-<variant>.jpg`: a user's cards share a folder, a kind's current files a prefix */
export function cardR2Keys(slot: CardSlot) {
	const dir = `${userCardDir(slot.userId)}${slot.kind}/`;
	const version = digest(slot.version, 16);
	return {
		dir,
		current: `${dir}${version}-`,
		key: `${dir}${version}-${digest(slot.variant, 32)}.jpg`,
	};
}

function cacheReady(): boolean {
	return r2WriteReady(r2CacheConfig());
}

export function cardDownloadFilename(kind: string): string {
	return `${kind.replace(/[^\w.-]+/g, "_")}.jpg`;
}

export function cardFilenameFromCacheKey(key: string): string {
	return cardDownloadFilename(key.split(":")[3] || "card");
}

export type CachedCard = { bytes: Buffer; store: "mem" | "r2" | "kv" };

export function durableCardStore(store: CachedCard["store"]): "r2" | "kv" {
	if (store === "kv") return "kv";
	if (store === "r2") return "r2";
	return cacheReady() ? "r2" : "kv";
}

/** `slot` places the card in R2; without one, only memory (or KV, when R2 is not set up) holds it */
export type CardCacheOpts = { durable?: boolean; slot?: CardSlot };

export async function readCachedPng(
	host: PngStore,
	key: string,
	opts: CardCacheOpts = {},
): Promise<CachedCard | undefined> {
	const hot = pngBufferCache.get(key);
	if (hot) {
		rememberPng(key, hot);
		return { bytes: hot, store: "mem" };
	}
	if (opts.durable === false) return undefined;
	if (cacheReady()) {
		if (!opts.slot) return undefined;
		const buf = await readPrivateR2Object(
			cardR2Keys(opts.slot).key,
			r2CacheConfig(),
		);
		if (buf?.byteLength) {
			rememberPng(key, buf);
			return { bytes: buf, store: "r2" };
		}
		return undefined;
	}
	const raw = await host.store.get(key);
	if (!raw) return undefined;
	const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, "base64");
	rememberPng(key, bytes);
	return { bytes, store: "kv" };
}

const cleanedDirs = new Map<string, string>();
const CLEANED_MAX = 4_000;

async function deleteCardKeys(prefix: string, keep?: string) {
	const cfg = r2CacheConfig();
	const keys = (await listAssetPrefix(prefix, cfg))
		.map((f) => f.key)
		.filter((k) => !keep || !k.startsWith(keep));
	await poolAll(keys, 8, (k) => deleteR2Object(k, cfg));
	return keys.length;
}

/** Every file in the kind's folder that is not of the current version: the new card replaces them */
async function dropStaleCards(dir: string, current: string) {
	if (cleanedDirs.get(dir) === current) return;
	const removed = await deleteCardKeys(dir, current);
	if (cleanedDirs.size >= CLEANED_MAX) cleanedDirs.clear();
	cleanedDirs.set(dir, current);
	if (removed) logger.info(`card cache: ${removed} stale removed`);
}

async function persistPng(
	host: PngStore,
	key: string,
	bytes: Buffer,
	slot: CardSlot | undefined,
) {
	try {
		if (cacheReady()) {
			if (!slot) return;
			const at = cardR2Keys(slot);
			await putR2Object(at.key, bytes, "image/jpeg", {
				contentDisposition: `attachment; filename="${cardFilenameFromCacheKey(key)}"`,
				cache: "no-store",
				background: true,
				cfg: r2CacheConfig(),
			});
			await dropStaleCards(at.dir, at.current);
			return;
		}
		await host.store.set(key, bytes.toString("base64"), {
			ttlMs: CARD_TTL_MS,
			background: true,
		});
	} catch (err) {
		logger.warn(
			`card cache write skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
}

export async function writeCachedPng(
	host: PngStore,
	key: string,
	bytes: Buffer,
	opts: CardCacheOpts = {},
): Promise<void> {
	rememberPng(key, bytes);
	if (opts.durable === false) return;
	runInBackground(persistPng(host, key, bytes, opts.slot));
}

/** After a cache bypass the new epoch keys every card apart, in memory too; this frees the old ones in R2 early */
export async function dropUserCards(userId: string): Promise<void> {
	if (!cacheReady()) return;
	try {
		await deleteCardKeys(userCardDir(userId));
	} catch (err) {
		logger.warn(
			`card cache drop skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
}
