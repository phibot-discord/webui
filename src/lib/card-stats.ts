import type { CardMissing } from "@/phi/lib/external";

export type CardCacheStore = "mem" | "r2" | "kv";
type CardSource = "r2" | "kv" | "render" | "browser";

export type CardStats = {
	cache: "hit" | "miss";
	store?: CardCacheStore;
	heightCache?: "hit" | "miss";
	revalidated?: boolean;
	shared?: boolean;
	prepMs?: number;
	cacheMs: number;
	dataMs?: number;
	htmlMs?: number;
	assetsMs?: number;
	measureMs?: number;
	rasterMs?: number;
	encodeMs?: number;
	paintMs?: number;
	extMs?: number;
	missing?: CardMissing[];
	totalMs: number;
	waitMs?: number;
};

export const CARD_STATS_HEADER = "x-phi-stats";

export function parseCardStats(
	raw: string | null | undefined,
): CardStats | undefined {
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw) as CardStats;
		if (parsed.cache !== "hit" && parsed.cache !== "miss") return;
		if (!Number.isFinite(parsed.cacheMs) || !Number.isFinite(parsed.totalMs))
			return;
		return parsed;
	} catch {
		return;
	}
}

export function encodeCardStats(stats: CardStats): string {
	return JSON.stringify(stats);
}

export function cardSource(stats: CardStats): CardSource {
	if (stats.revalidated) return "browser";
	if (stats.cache === "miss") return "render";
	if (stats.store === "kv") return "kv";
	return "r2";
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	if (ms >= 10_000) return `${(Math.round(ms / 100) / 10).toFixed(1)}s`;
	return `${(Math.round(ms / 10) / 100).toFixed(2)}s`;
}
