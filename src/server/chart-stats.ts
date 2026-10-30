import { HISTORY_PREFIX } from "@/lib/assets";
import { bareId } from "@/lib/chart-catalog";
import { type ChartStats, chartStats } from "@/lib/chart-stats";
import { assetVersion } from "./assets";
import { songHistory } from "./history";
import { fetchR2Object } from "./r2";

const MAX = 64;
const cache = new Map<string, ChartStats | null>();

export const CURRENT = "current";

export function chartJsonKey(stem: string, level: string, ver?: string) {
	return ver && ver !== CURRENT
		? `${HISTORY_PREFIX}/${ver}/chart/${stem}/${level}.json`
		: `chart/${stem}/${level}.json`;
}

function remember(key: string, value: ChartStats | null) {
	cache.delete(key);
	cache.set(key, value);
	while (cache.size > MAX) {
		const oldest = cache.keys().next().value;
		if (oldest === undefined) break;
		cache.delete(oldest);
	}
}

export function resetChartStatsForTest() {
	cache.clear();
}

export async function chartStatsKey(
	id: string,
	level: string,
	ver: string,
): Promise<string | undefined> {
	if (ver === CURRENT) return chartJsonKey(bareId(id), level);
	const song = await songHistory(id);
	const listed = song?.eras.some((era) => era.charts[level]?.rev === ver);
	return song && listed ? chartJsonKey(song.stem, level, ver) : undefined;
}

export async function loadChartStats(
	key: string,
	fetch: (key: string) => Promise<Buffer | undefined> = (k) =>
		fetchR2Object(k, { cache: "no-store" }),
): Promise<ChartStats | undefined> {
	const memo = `${key}@${assetVersion(key) ?? ""}`;
	if (cache.has(memo)) {
		const hit = cache.get(memo);
		remember(memo, hit ?? null);
		return hit ?? undefined;
	}
	const buf = await fetch(key);
	if (!buf) return undefined;
	let stats: ChartStats | undefined;
	try {
		stats = chartStats(JSON.parse(buf.toString("utf8")));
	} catch {
		stats = undefined;
	}
	remember(memo, stats ?? null);
	return stats;
}
