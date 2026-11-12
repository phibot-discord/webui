export type RankLookup =
	| {
			kind: "ranked";
			rank: number;
			of: number;
			percent: number | null;
			tied: number;
	  }
	| { kind: "none" }
	| { kind: "unavailable" };

export function rankUrl(chart: string, level: string, acc: number): string {
	return `/api/leaderboard?${new URLSearchParams({
		chart,
		level,
		acc: acc.toFixed(6),
	})}`;
}

export async function fetchRank(
	url: string,
	signal?: AbortSignal,
): Promise<RankLookup> {
	try {
		const res = await fetch(url, { signal });
		if (res.status === 404) return { kind: "none" };
		if (!res.ok) return { kind: "unavailable" };
		const body = (await res.json()) as {
			rank?: unknown;
			of?: unknown;
			percent?: unknown;
			tied?: unknown;
		};
		if (typeof body.rank !== "number" || typeof body.of !== "number") {
			return { kind: "unavailable" };
		}
		return {
			kind: "ranked",
			rank: body.rank,
			of: body.of,
			percent: typeof body.percent === "number" ? body.percent : null,
			tied: typeof body.tied === "number" ? body.tied : 0,
		};
	} catch {
		return { kind: "unavailable" };
	}
}
