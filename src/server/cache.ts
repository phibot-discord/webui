import { createHash } from "node:crypto";
import { after } from "next/server";
import { kvKey } from "@/phi/lib/const";
import { parseCachedHeight } from "./card-image-cache";
import type { WebHost } from "./host";
import { logger } from "./logger";
import { fetchR2Object, putR2Object, r2WriteReady } from "./r2";

const CARD_TTL_MS = 6 * 60 * 60 * 1000;
const CARD_R2_PREFIX = "web-cards";

const pngBufferCache = new Map<string, Buffer>();
const PNG_BUFFER_CACHE_MAX = 48;
const heightMem = new Map<string, number>();
const HEIGHT_MEM_MAX = 200;

function rememberPng(key: string, bytes: Buffer) {
	pngBufferCache.delete(key);
	if (pngBufferCache.size >= PNG_BUFFER_CACHE_MAX) {
		const oldest = pngBufferCache.keys().next().value;
		if (oldest !== undefined) pngBufferCache.delete(oldest);
	}
	pngBufferCache.set(key, bytes);
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
	try {
		after(() => persistHeight(store, id, n));
	} catch {
		await persistHeight(store, id, n);
	}
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

type PngStore = Pick<WebHost, "store">;

export function r2CardKey(key: string) {
	return `${CARD_R2_PREFIX}/${key}.jpg`;
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
	return r2WriteReady() ? "r2" : "kv";
}

export async function readCachedPng(
	host: PngStore,
	key: string,
): Promise<CachedCard | undefined> {
	const hot = pngBufferCache.get(key);
	if (hot) {
		rememberPng(key, hot);
		return { bytes: hot, store: "mem" };
	}
	if (r2WriteReady()) {
		const buf = await fetchR2Object(r2CardKey(key));
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

async function persistPng(host: PngStore, key: string, bytes: Buffer) {
	try {
		if (r2WriteReady()) {
			await putR2Object(r2CardKey(key), bytes, "image/jpeg", {
				contentDisposition: `attachment; filename="${cardFilenameFromCacheKey(key)}"`,
			});
			return;
		}
		await host.store.set(key, bytes.toString("base64"), {
			ttlMs: CARD_TTL_MS,
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
): Promise<void> {
	rememberPng(key, bytes);
	try {
		after(() => persistPng(host, key, bytes));
	} catch {
		await persistPng(host, key, bytes);
	}
}
