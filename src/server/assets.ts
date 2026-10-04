import {
	type AssetFile,
	PUBLIC_ASSET_PREFIXES,
	readAssetPage,
} from "@/lib/assets";
import { cfFetch } from "./cf-fetch";
import { logger } from "./logger";
import { r2Config, r2WriteReady } from "./r2";

const LIST_TTL_MS = 5 * 60 * 1000;
const LIST_PAGE_CAP = 20;
const LIST_MAX = 8_000;

let cached: { at: number; files: AssetFile[] } | undefined;
let listing: Promise<AssetFile[]> | undefined;

async function listPrefix(
	prefix: string,
	accountId: string,
	bucket: string,
	token: string,
): Promise<AssetFile[]> {
	const files: AssetFile[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < LIST_PAGE_CAP && files.length < LIST_MAX; page++) {
		const url = new URL(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/objects`,
		);
		url.searchParams.set("prefix", prefix);
		url.searchParams.set("per_page", "1000");
		if (cursor) url.searchParams.set("cursor", cursor);
		const res = await cfFetch(url.toString(), {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) {
			logger.warn(`r2 list ${res.status} ${prefix}`);
			throw new Error(`r2 list ${res.status}`);
		}
		const parsed = readAssetPage(await res.json());
		files.push(...parsed.files);
		if (!parsed.cursor) return files;
		cursor = parsed.cursor;
	}
	return files;
}

export function listPublicAssets(): Promise<AssetFile[]> {
	if (cached && Date.now() - cached.at < LIST_TTL_MS) {
		return Promise.resolve(cached.files);
	}
	if (listing) return listing;
	const cfg = r2Config();
	if (!r2WriteReady(cfg)) return Promise.reject(new Error("r2 unavailable"));
	listing = Promise.all(
		PUBLIC_ASSET_PREFIXES.map((prefix) =>
			listPrefix(prefix, cfg.accountId, cfg.bucket, cfg.apiToken),
		),
	)
		.then((groups) => {
			const files = groups
				.flat()
				.sort((a, b) => a.key.localeCompare(b.key))
				.slice(0, LIST_MAX);
			cached = { at: Date.now(), files };
			return files;
		})
		.finally(() => {
			listing = undefined;
		});
	return listing;
}
