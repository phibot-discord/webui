import { logger } from "./logger";

export type R2Config = {
	accountId: string;
	apiToken: string;
	bucket: string;
	prefix: string;
	publicBase: string;
};

export function r2Config(): R2Config {
	return {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "",
		apiToken: process.env.CLOUDFLARE_API_TOKEN?.trim() || "",
		bucket: process.env.CLOUDFLARE_R2_BUCKET?.trim() ?? "phi-web-assets",
		prefix: (process.env.CLOUDFLARE_R2_ILL_PREFIX ?? "original_ill").replace(
			/\/+$/,
			"",
		),
		publicBase: (process.env.CLOUDFLARE_R2_PUBLIC_BASE || "")
			.trim()
			.replace(/\/+$/, ""),
	};
}

export function r2Ready(cfg = r2Config()): boolean {
	if (cfg.publicBase) return true;
	return Boolean(cfg.accountId && cfg.apiToken && cfg.bucket);
}

function objectUrl(cfg: R2Config, key: string): string {
	return `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/r2/buckets/${encodeURIComponent(cfg.bucket)}/objects/${key
		.split("/")
		.map(encodeURIComponent)
		.join("/")}`;
}

export async function fetchR2Object(key: string): Promise<Buffer | undefined> {
	const cfg = r2Config();
	const k = key.replace(/^\//, "");
	if (cfg.publicBase) {
		const res = await fetch(`${cfg.publicBase}/${k}`);
		if (res.ok) return Buffer.from(await res.arrayBuffer());
		if (res.status !== 404) logger.warn(`r2 public ${res.status} ${k}`);
	}
	if (!cfg.accountId || !cfg.apiToken || !cfg.bucket) return undefined;
	const res = await fetch(objectUrl(cfg, k), {
		headers: { Authorization: `Bearer ${cfg.apiToken}` },
	});
	if (res.ok) return Buffer.from(await res.arrayBuffer());
	if (res.status !== 404) logger.warn(`r2 get ${res.status} ${k}`);
	return undefined;
}
