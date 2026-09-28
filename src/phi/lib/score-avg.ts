import { logger } from "@/server/logger";
import { type ChartTagJsonFetch, chartTagJsonFetch } from "./chart-tags-api";

type AccAvgCell = { accAvg: number | null; count?: number };
type AccAvgMap = Record<
	string,
	Record<string, AccAvgCell | undefined> | undefined
>;

type AccRankRow = {
	songId?: string;
	rank?: string;
	acc?: number;
	topPercent?: number;
};
type AccRankMap = {
	all?: AccRankRow[];
	b30?: AccRankRow[];
};

export type ScoreAvgSong = {
	id: string;
	rank: string;
	acc: number;
	accAvg?: string | number;
	accKind?: string;
};

type B19AvgOption = {
	avgType?: string;
	color?: string;
	avgValue?: boolean;
};

export function apiSongId(id: string) {
	return id.endsWith(".0") ? id : `${id}.0`;
}

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

function unwrapData<T>(raw: unknown): T | null {
	if (!raw || typeof raw !== "object") return null;
	const nested = "data" in raw ? (raw as { data: unknown }).data : raw;
	if (!nested || typeof nested !== "object") return null;
	return nested as T;
}

export async function fetchAllSongAccAvg(
	params: { songIds: string[]; minRks: number; maxRks: number },
	fetchJson: ChartTagJsonFetch = chartTagJsonFetch,
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
	fetchJson: ChartTagJsonFetch = chartTagJsonFetch,
) {
	return unwrapData<AccAvgMap>(
		await fetchJson("/get/scoreList/allAccAvgB30", {
			method: "POST",
			body: JSON.stringify(params),
		}),
	);
}

async function fetchAllSongAccRank(
	params: {
		queries: { songId: string; rank: string; acc: number }[];
		dimension: Array<"all" | "b30">;
		minRks: number;
		maxRks: number;
	},
	fetchJson: ChartTagJsonFetch = chartTagJsonFetch,
) {
	return unwrapData<AccRankMap>(
		await fetchJson("/get/scoreList/allAccRank", {
			method: "POST",
			body: JSON.stringify(params),
		}),
	);
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
		x.accKind = kind;
		if (
			topAll != null &&
			!Number.isNaN(topAll) &&
			topB30 != null &&
			!Number.isNaN(topB30)
		) {
			x.accAvg = `Top ${topAll.toFixed(2)}% / ${topB30.toFixed(2)}%`;
		}
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
};

/**
 * phib19 peer averages move slowly, while the same B30 is re-rendered for every
 * count / quality / language variant. Remember successful answers for a while.
 */
const AVG_TTL_MS = 10 * 60 * 1000;
const AVG_MAX = 128;
const avgMem = new Map<string, { at: number; value: Promise<unknown> }>();

function avgKey(name: string, params: object) {
	return `${name}|${JSON.stringify(params, (_k, v) =>
		Array.isArray(v) && v.every((x) => typeof x === "string")
			? [...v].sort()
			: v,
	)}`;
}

function memo<P extends object, R>(
	name: string,
	fn: (params: P) => Promise<R | null>,
): (params: P) => Promise<R | null> {
	return (params) => {
		const key = avgKey(name, params);
		const hit = avgMem.get(key);
		if (hit && Date.now() - hit.at < AVG_TTL_MS) return hit.value as Promise<R>;
		const value = fn(params).then((res) => {
			// Only successful lookups are worth keeping.
			if (res == null) avgMem.delete(key);
			return res;
		});
		value.catch(() => avgMem.delete(key));
		avgMem.delete(key);
		avgMem.set(key, { at: Date.now(), value });
		while (avgMem.size > AVG_MAX) {
			const oldest = avgMem.keys().next().value;
			if (oldest === undefined) break;
			avgMem.delete(oldest);
		}
		return value;
	};
}

const cachedAllAccAvg = memo("allAccAvg", fetchAllSongAccAvg);
const cachedAllAccAvgB30 = memo("allAccAvgB30", fetchAllSongAccAvgB30);
const cachedAllAccRank = memo("allAccRank", fetchAllSongAccRank);

export async function attachB19AccAvg(
	payload: {
		phi: Array<ScoreAvgSong | undefined>;
		b19_list: ScoreAvgSong[];
		com_rks: number;
	},
	option: B19AvgOption = {},
	fetchers: ScoreAvgFetchers = {},
) {
	const avgType = option.avgType || "all";
	if (avgType === "none") return payload;
	const allAccAvg = fetchers.allAccAvg ?? cachedAllAccAvg;
	const allAccAvgB30 = fetchers.allAccAvgB30 ?? cachedAllAccAvgB30;
	const allAccRank = fetchers.allAccRank ?? cachedAllAccRank;
	const songIds = uniqueSongIds([payload.phi, payload.b19_list]);
	if (!songIds.length) return payload;
	try {
		if (avgType === "all") {
			const band = rksAvgBand(payload.com_rks);
			const res = await allAccAvg({ songIds, ...band });
			if (!res) throw new Error("avg-getAllSongAccAvg failed");
			const fmt = { prefix: "Avg:", avgValue: option.avgValue };
			const allHigher = applyAccAvgMap(payload.b19_list, res, {
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
			if (allHigher) {
				const up = rksAvgBandUp(payload.com_rks);
				const next = await allAccAvg({ songIds, ...up });
				if (!next) throw new Error("avg-getAllSongAccAvg-up failed");
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
			}
		} else if (avgType === "b30") {
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
			applyAccAvgMap(payload.b19_list, res, fmt);
			applyAccAvgMap(payload.phi, res, fmt);
		} else if (avgType === "top") {
			const band = rksAvgBand(payload.com_rks);
			const queries = payload.b19_list.map((row) => ({
				songId: apiSongId(row.id),
				rank: row.rank,
				acc: row.acc,
			}));
			const res = await allAccRank({
				queries,
				dimension: ["all", "b30"],
				...band,
			});
			if (!res) throw new Error("avg-getAllSongAccRank failed");
			applyAccRank(payload.b19_list, res, topKind(option.color));
		}
	} catch (err) {
		logger.warn(`b30 avg skip: ${err instanceof Error ? err.message : err}`);
	}
	return payload;
}
