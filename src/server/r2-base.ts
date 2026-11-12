// R2 settings and API URLs, below the listing (assets.ts) and the reads (r2.ts) that use them

import { type R2S3, r2S3FromEnv, type SignedRequest, s3Request } from "./r2-s3";

export type R2Config = {
	accountId: string;
	apiToken: string;
	bucket: string;
	publicBase: string;
	s3?: R2S3;
};

export const ILL_PREFIX = "original_ill";
export const HTML_PREFIX = "html";
export const INFO_PREFIX = "info";

function normalizePublicBase(raw: string | undefined): string {
	const t = (raw || "").trim().replace(/\/+$/, "");
	if (!t) return "";
	if (/^https?:\/\//i.test(t)) return t;
	return `https://${t}`;
}

export function r2BucketName(raw = process.env.CLOUDFLARE_R2_BUCKET) {
	const t = raw?.trim() || "";
	if (t === "off" || t === "none") return "";
	if (!t || t === "[SENSITIVE]") return "phi-web-assets";
	return t;
}

export function r2Config(): R2Config {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
	return {
		accountId,
		apiToken: process.env.CLOUDFLARE_API_TOKEN?.trim() || "",
		bucket: r2BucketName(),
		publicBase: normalizePublicBase(process.env.CLOUDFLARE_R2_PUBLIC_BASE),
		s3: r2S3FromEnv(accountId),
	};
}

/** The private bucket for rendered cards: no public domain, so every read goes through the API */
export function r2CacheConfig(): R2Config {
	return {
		...r2Config(),
		bucket: "phi-web-cache",
		publicBase: "",
	};
}

export function r2Ready(cfg = r2Config()): boolean {
	if (cfg.publicBase) return true;
	return r2WriteReady(cfg);
}

export function r2WriteReady(cfg = r2Config()): boolean {
	return Boolean(cfg.bucket && (cfg.s3 || (cfg.accountId && cfg.apiToken)));
}

function bucketObjectsUrl(cfg: R2Config): string {
	return `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/r2/buckets/${encodeURIComponent(cfg.bucket)}/objects`;
}

export function objectUrl(cfg: R2Config, key: string): string {
	const parts = key.split("/");
	if (parts.some((p) => p === "." || p === "..")) {
		throw new Error("r2 key has a dot segment");
	}
	return `${bucketObjectsUrl(cfg)}/${parts.map(encodeURIComponent).join("/")}`;
}

export function objectRequest(
	cfg: R2Config,
	method: string,
	key: string,
	body?: Uint8Array,
): SignedRequest {
	if (cfg.s3) return s3Request(cfg.s3, cfg.bucket, method, key, { body });
	return {
		url: objectUrl(cfg, key),
		headers: { Authorization: `Bearer ${cfg.apiToken}` },
	};
}

export function listRequest(
	cfg: R2Config,
	prefix: string,
	cursor?: string,
): SignedRequest {
	if (cfg.s3) {
		return s3Request(cfg.s3, cfg.bucket, "GET", undefined, {
			query: {
				"list-type": "2",
				"max-keys": "1000",
				prefix,
				...(cursor ? { "continuation-token": cursor } : {}),
			},
		});
	}
	const url = new URL(bucketObjectsUrl(cfg));
	url.searchParams.set("prefix", prefix);
	url.searchParams.set("per_page", "1000");
	if (cursor) url.searchParams.set("cursor", cursor);
	return {
		url: url.toString(),
		headers: { Authorization: `Bearer ${cfg.apiToken}` },
	};
}
