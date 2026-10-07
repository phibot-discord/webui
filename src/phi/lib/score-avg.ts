import { logger } from "@/server/logger";
import type { Kv } from "@/server/sdk";
import type { PhiLocale } from "./card-i18n";
import {
	type ChartTagJsonFetch,
	chartTagJsonFetchOnce,
	withChartTagBudget,
} from "./chart-tags-api";
import {
	apiSongId,
	clampAcc,
	fetchAccRanks,
	fmtCount,
	fmtTopPercent,
	LB_ROW_BUDGET_MS,
	type AccRankRow as LbRankRow,
	peekRankRows,
	placeUser,
	type RankDim,
	type RankQuery,
	type RankRowsResult,
	type RksBand,
	rankKey,
	rankRows,
} from "./leaderboard";

export { apiSongId };

type AccAvgCell = { accAvg: number | null; count?: number };
type AccAvgMap = Record<
	string,
	Record<string, AccAvgCell | undefined> | undefined
>;

type AccRankRow = {
	songId?: string;
	rank?: string;
	acc?: number;
	topPercent?: number | null;
	better?: number;
	total?: number;
};
type AccRankMap = {
	all?: AccRankRow[];
	b30?: AccRankRow[];
};

/** Rank badge pieces ("rank" mode), next to the one-line `accAvg` text */
export type AccRankBadge = {
	pos: string;
	of: string;
	pct: string;
	rank: number;
	total: number;
	percent: number;
	/** Other records tied at #1 (AP only) */
	tied: number;
	ap: boolean;
};

export type ScoreAvgSong = {
	id: string;
	rank: string;
	acc: number;
	accAvg?: string | number;
	accKind?: string;
	accRank?: AccRankBadge;
};

type B19AvgOption = {
	avgType?: string;
	color?: string;
	avgValue?: boolean;
	/** "rank" mode keeps one KV blob per card's rows here */
	db?: Pick<Kv, "get" | "set">;
	/** How long the card waits for phib19 (default LB_ROW_BUDGET_MS) */
	budgetMs?: number;
};

export function rksAvgBand(comRks: number) {
	const rks = Number.isFinite(comRks) ? comRks : 0;
	return {
		minRks: Math.max(0, Math.floor((rks - 0.05) / 0.05) * 0.05),
		maxRks: Math.max(0, Math.floor((rks + 0.05) / 0.05) * 0.05),
	};
}

export function rksAvgBandUp(comRks: number) {
	const rks = Number.isFinite(comRks) ? comRks : 0;
	return {
		minRks: Math.max(0, (Math.floor((rks - 0.05) / 0.05) + 2) * 0.05),
		maxRks: Math.max(0, (Math.ceil((rks + 0.05) / 0.05) + 2) * 0.05),
	};
}

/** `{data}` → data. phib19 reports some failures as HTTP 200 `{error}`: null */
function unwrapData<T>(raw: unknown): T | null {
	if (!raw || typeof raw !== "object" || "error" in raw) return null;
	const nested = "data" in raw ? (raw as { data: unknown }).data : raw;
	if (!nested || typeof nested !== "object") return null;
	return nested as T;
}

export async function fetchAllSongAccAvg(
	params: { songIds: string[]; minRks: number; maxRks: number },
	fetchJson: ChartTagJsonFetch = chartTagJsonFetchOnce,
) {
	return unwrapData<AccAvgMap>(
		await fetchJson("/get/scoreList/allAccAvg", {
			method: "POST",
			body: JSON.stringify(params),
		}),
	);
}

async function fetchAllSongAccAvgB30(
	params: { songIds: string[]; minRks: number; maxRks: number },
	fetchJson: ChartTagJsonFetch = chartTagJsonFetchOnce,
) {
	return unwrapData<AccAvgMap>(
		await fetchJson("/get/scoreList/allAccAvgB30", {
			method: "POST",
			body: JSON.stringify(params),
		}),
	);
}

/** "top" mode: phib19's banded share of records at or above each row's acc */
async function fetchAllSongAccRank(params: {
	queries: RankQuery[];
	dimension: RankDim[];
	minRks: number;
	maxRks: number;
}): Promise<AccRankMap | null> {
	const { queries, dimension, ...band } = params;
	const res = await fetchAccRanks(queries, { dims: dimension, band });
	const top = (rows: Array<LbRankRow | null> | undefined) =>
		rows?.map((row) =>
			row && row.total > 0
				? { ...row, topPercent: (row.better / row.total) * 100 }
				: {},
		);
	return { all: top(res.all), b30: top(res.b30) };
}

function lookupAccAvg(map: AccAvgMap, id: string, rank: string) {
	const cell =
		map[id]?.[rank] ||
		map[apiSongId(id)]?.[rank] ||
		(id.endsWith(".0") ? map[id.slice(0, -2)]?.[rank] : undefined);
	const n = cell?.accAvg;
	if (n == null || Number.isNaN(Number(n))) return;
	return Number(n);
}

function formatAvg(accAvg: number, prefix: string, avgValue?: boolean) {
	return avgValue ? accAvg : `${prefix} ${accAvg.toFixed(4)}%`;
}

export function applyAccAvgMap(
	rows: Array<ScoreAvgSong | undefined | null>,
	map: AccAvgMap,
	opts: {
		low: string;
		high: string;
		prefix: string;
		avgValue?: boolean;
		stopAfter?: number;
	},
) {
	let allHigher = true;
	for (let i = 0; i < rows.length; i++) {
		if (opts.stopAfter != null && i >= opts.stopAfter && allHigher) break;
		const x = rows[i];
		if (!x || x.rank === "LEGACY") continue;
		const accAvg = lookupAccAvg(map, x.id, x.rank);
		if (accAvg == null) continue;
		x.accAvg = formatAvg(accAvg, opts.prefix, opts.avgValue);
		if (x.acc < accAvg) {
			allHigher = false;
			x.accKind = opts.low;
		} else {
			x.accKind = opts.high;
		}
	}
	return allHigher;
}

export function applyAccRank(
	rows: ScoreAvgSong[],
	res: AccRankMap,
	kind: string,
) {
	for (let i = 0; i < rows.length; i++) {
		const x = rows[i];
		if (!x || x.rank === "LEGACY") continue;
		const topAll = res.all?.[i]?.topPercent;
		const topB30 = res.b30?.[i]?.topPercent;
		if (
			topAll != null &&
			!Number.isNaN(topAll) &&
			topB30 != null &&
			!Number.isNaN(topB30)
		) {
			x.accKind = kind;
			x.accAvg = `Top ${topAll.toFixed(2)}% / ${topB30.toFixed(2)}%`;
		}
	}
}

/** Short enough for the classic card's one-line chip; an AP shows #1 with its share */
const RANK_LEGEND: Record<PhiLocale, string> = {
	en: "#rank / records on phib19.top (est.)",
	zh: "#名次 / phib19.top 记录数（估算）",
};

/** One line naming the population behind the "rank" badges (a card chip) */
export function rankLegend(locale: PhiLocale) {
	return RANK_LEGEND[locale] ?? RANK_LEGEND.en;
}

/** "rank" mode: the row's place among phib19 records, e.g. "#3,611 / 70,388 · Top 5.1%" */
export function applyRowRanks(
	rows: Array<ScoreAvgSong | undefined | null>,
	ranks: Map<string, LbRankRow>,
) {
	for (const x of rows) {
		if (!x || x.rank === "LEGACY") continue;
		const place = placeUser(
			x.acc,
			ranks.get(rankKey({ songId: x.id, rank: x.rank, acc: x.acc })),
		);
		if (!place) continue;
		const badge: AccRankBadge = {
			pos: `#${fmtCount(place.rank)}`,
			of: `/ ${fmtCount(place.of)}`,
			pct: `${place.ap ? "AP" : "Top"} ${fmtTopPercent(place.percent)}%`,
			rank: place.rank,
			total: place.of,
			percent: place.percent,
			tied: place.tied,
			ap: place.ap,
		};
		x.accKind = "Rank";
		x.accRank = badge;
		x.accAvg = `${badge.pos} ${badge.of} · ${badge.pct}`;
	}
}

function uniqueSongIds(lists: Array<Array<ScoreAvgSong | undefined | null>>) {
	const ids = new Set<string>();
	for (const list of lists) {
		for (const row of list) {
			if (row?.id) ids.add(apiSongId(row.id));
		}
	}
	return [...ids];
}

function topKind(color?: string) {
	switch (color) {
		case "red":
			return "Lower";
		case "gold":
			return "Higher";
		case "blue":
			return "Hyper";
		case "green":
			return "Finished";
		default:
			return "Finished";
	}
}

type ScoreAvgFetchers = {
	allAccAvg?: typeof fetchAllSongAccAvg;
	allAccAvgB30?: typeof fetchAllSongAccAvgB30;
	allAccRank?: typeof fetchAllSongAccRank;
	rankRows?: (
		queries: RankQuery[],
		opts: { db?: Pick<Kv, "get" | "set"> },
	) => Promise<RankRowsResult>;
	/** Rows already in memory, for a "rank" lookup past its budget */
	peekRankRows?: (queries: RankQuery[]) => Map<string, LbRankRow>;
};

/**
 * phib19 peer averages move slowly, while the same B30 is re-rendered for every
 * count / quality / language variant. Remember answers for a while, and a failure
 * briefly, so a dead upstream is not asked again on every render
 */
const AVG_TTL_MS = 10 * 60 * 1000;
const AVG_FAIL_TTL_MS = 90 * 1000;
const AVG_MAX = 128;
const avgMem = new Map<string, { until: number; value: Promise<unknown> }>();

function avgKey(name: string, params: object) {
	return `${name}|${JSON.stringify(params, (_k, v) =>
		Array.isArray(v) && v.every((x) => typeof x === "string")
			? [...v].sort()
			: v,
	)}`;
}

function remember(key: string, value: Promise<unknown>, ttlMs: number) {
	avgMem.delete(key);
	avgMem.set(key, { until: Date.now() + ttlMs, value });
	while (avgMem.size > AVG_MAX) {
		const oldest = avgMem.keys().next().value;
		if (oldest === undefined) break;
		avgMem.delete(oldest);
	}
}

/** Shared, cached lookups that resolve to null on any failure (never reject) */
function memo<P extends object, R>(
	name: string,
	fn: (params: P) => Promise<R | null>,
): (params: P) => Promise<R | null> {
	return (params) => {
		const key = avgKey(name, params);
		const hit = avgMem.get(key);
		if (hit && Date.now() < hit.until) return hit.value as Promise<R | null>;
		const value: Promise<R | null> = fn(params)
			.catch((err) => {
				logger.warn(
					`${name} failed: ${err instanceof Error ? err.message : err}`,
				);
				return null;
			})
			.then((res) => {
				if (res == null && avgMem.get(key)?.value === value) {
					remember(key, Promise.resolve(null), AVG_FAIL_TTL_MS);
				}
				return res;
			});
		remember(key, value, AVG_TTL_MS);
		return value;
	};
}

export function resetScoreAvgMemForTest() {
	avgMem.clear();
}

const cachedAllAccAvg = memo("allAccAvg", fetchAllSongAccAvg);
const cachedAllAccAvgB30 = memo("allAccAvgB30", fetchAllSongAccAvgB30);
const cachedAllAccRank = memo("allAccRank", fetchAllSongAccRank);

type AvgPayload = {
	phi: Array<ScoreAvgSong | undefined>;
	b19_list: ScoreAvgSong[];
	com_rks: number;
};

/** How to label the rows, and whether some rows had to go without (rank mode) */
type AvgLookup = { apply: () => void; partial: boolean };

/** The rows "rank" mode badges: phi and b19, LEGACY left out */
function rankModeRows(payload: AvgPayload) {
	return [...payload.phi, ...payload.b19_list].filter(
		(row): row is ScoreAvgSong => Boolean(row) && row?.rank !== "LEGACY",
	);
}

function rankQueries(rows: ScoreAvgSong[]): RankQuery[] {
	return rows.map((row) => ({ songId: row.id, rank: row.rank, acc: row.acc }));
}

/** Fetches what one mode needs; writes nothing to rows, so a late answer can't touch a card being drawn */
async function lookupAvg(
	avgType: string,
	payload: AvgPayload,
	option: B19AvgOption,
	fetchers: ScoreAvgFetchers,
	songIds: string[],
): Promise<AvgLookup> {
	if (avgType === "all") {
		const allAccAvg = fetchers.allAccAvg ?? cachedAllAccAvg;
		const band = rksAvgBand(payload.com_rks);
		const res = await allAccAvg({ songIds, ...band });
		if (!res) throw new Error("avg-getAllSongAccAvg failed");
		const fmt = { prefix: "Avg:", avgValue: option.avgValue };
		const probe = payload.b19_list.map((row) => ({ ...row }));
		const allHigher = applyAccAvgMap(probe, res, {
			low: "Lower",
			high: "Higher",
			stopAfter: 27,
			...fmt,
		});
		let next: AccAvgMap | null = null;
		if (allHigher) {
			next = await allAccAvg({ songIds, ...rksAvgBandUp(payload.com_rks) });
			if (!next) throw new Error("avg-getAllSongAccAvg-up failed");
		}
		const apply = () => {
			applyAccAvgMap(payload.b19_list, res, {
				low: "Lower",
				high: "Higher",
				stopAfter: 27,
				...fmt,
			});
			applyAccAvgMap(payload.phi, res, {
				low: "Lower",
				high: "Higher",
				...fmt,
			});
			if (!next) return;
			applyAccAvgMap(payload.b19_list, next, {
				low: "Hyper",
				high: "Finished",
				...fmt,
			});
			applyAccAvgMap(payload.phi, next, {
				low: "Hyper",
				high: "Finished",
				...fmt,
			});
		};
		return { apply, partial: false };
	}
	if (avgType === "b30") {
		const allAccAvgB30 = fetchers.allAccAvgB30 ?? cachedAllAccAvgB30;
		const band = rksAvgBand(payload.com_rks);
		const res = await allAccAvgB30({ songIds, ...band });
		if (!res) throw new Error("avg-getAllSongAccAvgB30 failed");
		const warm = option.color === "red" || option.color === "gold";
		const fmt = {
			low: warm ? "Lower" : "Hyper",
			high: warm ? "Higher" : "Finished",
			prefix: "BAvg:",
			avgValue: option.avgValue,
		};
		return {
			apply: () => {
				applyAccAvgMap(payload.b19_list, res, fmt);
				applyAccAvgMap(payload.phi, res, fmt);
			},
			partial: false,
		};
	}
	if (avgType === "top") {
		const allAccRank = fetchers.allAccRank ?? cachedAllAccRank;
		const band: RksBand = rksAvgBand(payload.com_rks);
		const queries = payload.b19_list.map((row) => ({
			songId: apiSongId(row.id),
			rank: row.rank,
			acc: clampAcc(row.acc),
		}));
		const res = await allAccRank({
			queries,
			dimension: ["all", "b30"],
			...band,
		});
		if (!res) throw new Error("avg-getAllSongAccRank failed");
		return {
			apply: () => applyAccRank(payload.b19_list, res, topKind(option.color)),
			partial: false,
		};
	}
	if (avgType === "rank") {
		const rows = rankModeRows(payload);
		const lookup = fetchers.rankRows ?? rankRows;
		// Never rejects: a failed chunk still returns the rows that arrived
		const res = await lookup(rankQueries(rows), { db: option.db });
		return {
			apply: () => applyRowRanks(rows, res.rows),
			partial: res.partial,
		};
	}
	// A mode the webui doesn't know (the Discord bot may store others): no badges
	return { apply: () => undefined, partial: false };
}

/** Peer averages / ranks for the B30 rows within `budgetMs`; past it rows stay bare and `partial` is set */
export async function attachB19AccAvg(
	payload: AvgPayload,
	option: B19AvgOption = {},
	fetchers: ScoreAvgFetchers = {},
): Promise<{ partial: boolean }> {
	const avgType = option.avgType || "all";
	if (avgType === "none") return { partial: false };
	const songIds = uniqueSongIds([payload.phi, payload.b19_list]);
	if (!songIds.length) return { partial: false };
	try {
		const { apply, partial } = await withChartTagBudget(
			lookupAvg(avgType, payload, option, fetchers, songIds),
			option.budgetMs ?? LB_ROW_BUDGET_MS,
			`avg-${avgType}`,
		);
		apply();
		return { partial };
	} catch (err) {
		logger.warn(`b30 avg skip: ${err instanceof Error ? err.message : err}`);
		if (avgType === "rank") {
			const rows = rankModeRows(payload);
			const peek = fetchers.peekRankRows ?? peekRankRows;
			applyRowRanks(rows, peek(rankQueries(rows)));
		}
		return { partial: true };
	}
}
