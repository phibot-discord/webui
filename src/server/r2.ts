import { refreshedVersion } from "@/lib/asset-refresh";
import { changesInPlace, publicAssetUrl } from "@/lib/assets";
import { evictOldest, evictToBudget } from "@/phi/lib/lru";
import { assetVersion, versionsSettled } from "./assets";
import { cfFail, cfFetch } from "./cf-fetch";
import { logger } from "./logger";
import {
	objectRequest,
	type R2Config,
	r2Config,
	r2WriteReady,
} from "./r2-base";

export {
	HTML_PREFIX,
	ILL_PREFIX,
	INFO_PREFIX,
	type R2Config,
	r2BucketName,
	r2CacheConfig,
	r2Config,
	r2Ready,
	r2WriteReady,
} from "./r2-base";

type CacheMode = "default" | "no-store";

const mem = new Map<string, Buffer>();
const inflight = new Map<string, Promise<Buffer | undefined>>();
let memBytes = 0;
const MEM_MAX_BYTES = 256 * 1024 * 1024;
const missing = new Map<string, number>();
const MISSING_TTL_MS = 15 * 60 * 1000;
const MISSING_MAX = 4_000;

function knownMissing(key: string) {
	const until = missing.get(key);
	if (until == null) return false;
	if (until > Date.now()) return true;
	missing.delete(key);
	return false;
}

function rememberMissing(key: string) {
	missing.delete(key);
	missing.set(key, Date.now() + MISSING_TTL_MS);
	evictOldest(missing, MISSING_MAX);
}

/** `token`: the visitor's Refresh files token, for links a page renders (asset-links.ts) */
export function publicObjectUrl(
	key: string,
	cfg = r2Config(),
	token?: string,
): string | undefined {
	if (!cfg.publicBase) return;
	const version = assetVersion(key.replace(/^\//, ""));
	return publicAssetUrl(cfg.publicBase, key, refreshedVersion(version, token));
}

function remember(key: string, buf: Buffer) {
	const prev = mem.get(key);
	if (prev) memBytes -= prev.byteLength;
	mem.delete(key);
	mem.set(key, buf);
	memBytes += buf.byteLength;
	memBytes = evictToBudget(
		mem,
		memBytes,
		MEM_MAX_BYTES,
		(value) => value.byteLength,
	);
}

let lastReadError: number | undefined;

function recordR2Error() {
	lastReadError = performance.now();
}

export function r2ErrorSince(t: number): boolean {
	return lastReadError !== undefined && lastReadError >= t;
}

export function resetR2ErrorForTest() {
	lastReadError = undefined;
}

async function readPublic(
	cfg: R2Config,
	key: string,
): Promise<Buffer | false | undefined> {
	const url = publicObjectUrl(key, cfg);
	if (!url) return;
	const res = await cfFetch(url);
	if (res.ok) return Buffer.from(await res.arrayBuffer());
	if (res.status === 404) return false;
	recordR2Error();
	logger.warn(`r2 public ${res.status} ${key}`);
	return undefined;
}

async function readApi(
	cfg: R2Config,
	key: string,
): Promise<Buffer | false | undefined> {
	if (!r2WriteReady(cfg)) return undefined;
	const req = objectRequest(cfg, "GET", key);
	const res = await cfFetch(req.url, { headers: req.headers });
	if (res.ok) return Buffer.from(await res.arrayBuffer());
	if (res.status === 404) return false;
	recordR2Error();
	logger.warn(`r2 get ${res.status} ${key}`);
	return undefined;
}

/** After a public-domain failure, use the API until then */
let publicBrokenUntil = 0;
const PUBLIC_RETRY_MS = 60_000;

/** The edge copy is trusted only under a versioned link; in-place data and unknown keys go through the API */
export function readsViaEdge(key: string, api: boolean): boolean {
	if (!api) return true;
	return !changesInPlace(key) && Boolean(assetVersion(key));
}

async function viaEdge(key: string, api: boolean): Promise<boolean> {
	if (api && !changesInPlace(key)) await versionsSettled();
	return readsViaEdge(key, api);
}

/** `false`: absent (404); `undefined`: unknown or error */
async function loadR2Object(
	key: string,
	fresh: boolean,
): Promise<Buffer | false | undefined> {
	const cfg = r2Config();
	const api = r2WriteReady(cfg);
	if (api && (fresh || !(await viaEdge(key, api)))) return readApi(cfg, key);
	if (cfg.publicBase && Date.now() >= publicBrokenUntil) {
		try {
			const pub = await readPublic(cfg, key);
			if (Buffer.isBuffer(pub) || pub === false) return pub;
		} catch (err) {
			recordR2Error();
			// Requests already in flight all fail together; report the outage once
			if (Date.now() >= publicBrokenUntil) {
				logger.warn(
					`r2 public paused ${PUBLIC_RETRY_MS / 1000}s: ${err instanceof Error ? err.message : err}`,
				);
			}
			publicBrokenUntil = Date.now() + PUBLIC_RETRY_MS;
		}
	}
	return readApi(cfg, key);
}

export type R2Stream = {
	body: ReadableStream<Uint8Array>;
	length?: number;
};

async function openStream(
	url: string,
	headers?: Record<string, string>,
): Promise<R2Stream | false | undefined> {
	// fetch inflates a compressed body: ask for the stored bytes, and drop the length if they still come encoded
	const res = await cfFetch(url, {
		headers: { ...headers, "Accept-Encoding": "identity" },
		stream: true,
	});
	if (res.ok && res.body) {
		const encoding = (res.headers.get("content-encoding") || "identity")
			.trim()
			.toLowerCase();
		const length = Number(res.headers.get("content-length"));
		return {
			body: res.body,
			length:
				encoding === "identity" && Number.isFinite(length) && length > 0
					? length
					: undefined,
		};
	}
	await res.body?.cancel().catch(() => undefined);
	if (res.status === 404) return false;
	logger.warn(
		`r2 stream ${res.status} ${new URL(url).pathname.replace(/^.*\/objects\//, "")}`,
	);
	return undefined;
}

/** Piped, not buffered, so large objects (Phira packs) escape the 4.5 MB function body limit */
export async function streamR2Object(
	key: string,
): Promise<R2Stream | undefined> {
	const k = key.replace(/^\//, "");
	if (knownMissing(k)) return undefined;
	const cfg = r2Config();
	const pub = publicObjectUrl(k, cfg);
	const edge = await viaEdge(k, r2WriteReady(cfg));
	if (pub && edge && Date.now() >= publicBrokenUntil) {
		try {
			const got = await openStream(pub);
			if (got === false) {
				rememberMissing(k);
				return undefined;
			}
			if (got) return got;
		} catch (err) {
			logger.warn(
				`r2 public stream failed: ${err instanceof Error ? err.message : err}`,
			);
		}
	}
	if (!r2WriteReady(cfg)) return undefined;
	const req = objectRequest(cfg, "GET", k);
	const got = await openStream(req.url, req.headers);
	if (got === false) rememberMissing(k);
	return got || undefined;
}

export async function fetchR2Object(
	key: string,
	opts: { cache?: CacheMode; negative?: boolean; fresh?: boolean } = {},
): Promise<Buffer | undefined> {
	const k = key.replace(/^\//, "");
	const noStore = opts.cache === "no-store";
	const negative = opts.negative !== false;
	if (!noStore) {
		const hot = mem.get(k);
		if (hot) {
			remember(k, hot);
			return hot;
		}
	}
	if (negative && knownMissing(k)) return undefined;
	const pending = inflight.get(k);
	if (pending) return pending;
	const job = loadR2Object(k, opts.fresh === true)
		.then((buf) => {
			if (buf === false) {
				if (negative) rememberMissing(k);
				return undefined;
			}
			if (buf?.byteLength && !noStore) remember(k, buf);
			return buf;
		})
		.finally(() => inflight.delete(k));
	inflight.set(k, job);
	return job;
}

export async function putR2Object(
	key: string,
	body: Buffer,
	contentType = "application/octet-stream",
	extra: {
		contentDisposition?: string;
		cache?: CacheMode;
		background?: boolean;
		timeoutMs?: number;
		cfg?: R2Config;
	} = {},
): Promise<void> {
	const cfg = extra.cfg ?? r2Config();
	if (!r2WriteReady(cfg)) {
		throw new Error("R2 write is not configured");
	}
	const k = key.replace(/^\//, "");
	const req = objectRequest(cfg, "PUT", k, body);
	const headers: Record<string, string> = {
		...req.headers,
		"Content-Type": contentType,
	};
	if (extra.contentDisposition) {
		headers["Content-Disposition"] = extra.contentDisposition;
	}
	const res = await cfFetch(req.url, {
		method: "PUT",
		headers,
		body,
		background: extra.background,
		timeoutMs: extra.timeoutMs,
	});
	if (!res.ok) await cfFail(res, `R2 PUT ${k}`);
	missing.delete(k);
	if (extra.cache !== "no-store") remember(k, body);
}

export async function deleteR2Object(
	key: string,
	cfg = r2Config(),
): Promise<void> {
	if (!r2WriteReady(cfg)) throw new Error("R2 write is not configured");
	const req = objectRequest(cfg, "DELETE", key);
	const res = await cfFetch(req.url, {
		method: "DELETE",
		headers: req.headers,
	});
	if (!res.ok && res.status !== 404) await cfFail(res, `R2 DELETE ${key}`);
	// a private bucket has no public reads to keep in step
	if (!cfg.publicBase) return;
	const prev = mem.get(key);
	if (prev) memBytes -= prev.byteLength;
	mem.delete(key);
	rememberMissing(key);
}

/** One object through the API, uncached: for a private bucket. Undefined when it is absent or the read fails */
export async function readPrivateR2Object(
	key: string,
	cfg: R2Config,
): Promise<Buffer | undefined> {
	const got = await readApi(cfg, key);
	return Buffer.isBuffer(got) ? got : undefined;
}
