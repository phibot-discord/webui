// R2 settings and API URLs, below the listing (assets.ts) and the reads (r2.ts) that use them

export type R2Config = {
	accountId: string;
	apiToken: string;
	bucket: string;
	prefix: string;
	htmlPrefix: string;
	publicBase: string;
};

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
	return {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "",
		apiToken: process.env.CLOUDFLARE_API_TOKEN?.trim() || "",
		bucket: r2BucketName(),
		prefix: (process.env.CLOUDFLARE_R2_ILL_PREFIX ?? "original_ill").replace(
			/\/+$/,
			"",
		),
		htmlPrefix: (process.env.CLOUDFLARE_R2_HTML_PREFIX ?? "html").replace(
			/\/+$/,
			"",
		),
		publicBase: normalizePublicBase(process.env.CLOUDFLARE_R2_PUBLIC_BASE),
	};
}

/** The private bucket for rendered cards: no public domain, so every read goes through the API */
export function r2CacheConfig(): R2Config {
	return {
		...r2Config(),
		bucket: r2BucketName(
			process.env.CLOUDFLARE_R2_CACHE_BUCKET?.trim() || "phi-web-cache",
		),
		publicBase: "",
	};
}

export function r2Ready(cfg = r2Config()): boolean {
	if (cfg.publicBase) return true;
	return r2WriteReady(cfg);
}

export function r2WriteReady(cfg = r2Config()): boolean {
	return Boolean(cfg.accountId && cfg.apiToken && cfg.bucket);
}

export function bucketObjectsUrl(cfg: R2Config): string {
	return `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/r2/buckets/${encodeURIComponent(cfg.bucket)}/objects`;
}

export function objectUrl(cfg: R2Config, key: string): string {
	return `${bucketObjectsUrl(cfg)}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
