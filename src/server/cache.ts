import { createHash } from "node:crypto";
import { kvKey } from "@/phi/lib/const";
import type { WebHost } from "./host";
import { logger } from "./logger";
import { renderLock, withTimeout } from "./render-lock";

const CARD_TTL_MS = 6 * 60 * 60 * 1000;

const pngBufferCache = new Map<string, Buffer>();
const PNG_BUFFER_CACHE_MAX = 16;

function rememberPng(key: string, bytes: Buffer) {
	pngBufferCache.delete(key);
	if (pngBufferCache.size >= PNG_BUFFER_CACHE_MAX) {
		const oldest = pngBufferCache.keys().next().value;
		if (oldest !== undefined) pngBufferCache.delete(oldest);
	}
	pngBufferCache.set(key, bytes);
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

export async function readCachedPng(
	host: WebHost,
	key: string,
): Promise<Buffer | undefined> {
	const hot = pngBufferCache.get(key);
	if (hot) {
		rememberPng(key, hot);
		return hot;
	}
	const raw = await host.store.get(key);
	if (!raw) return undefined;
	const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, "base64");
	rememberPng(key, bytes);
	return bytes;
}

export async function writeCachedPng(
	host: WebHost,
	key: string,
	bytes: Buffer,
): Promise<void> {
	rememberPng(key, bytes);
	try {
		await host.store.set(key, bytes.toString("base64"), {
			ttlMs: CARD_TTL_MS,
		});
	} catch (err) {
		logger.warn(
			`card cache write skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
}

export async function renderTemplatePng(
	host: WebHost,
	templateId: string,
	data: Record<string, unknown>,
	opts: { heightKey?: string } = {},
): Promise<Buffer> {
	const img = await renderLock.run(() =>
		withTimeout(host.render(templateId, data, opts), 45_000, templateId),
	);
	return img.bytes;
}
