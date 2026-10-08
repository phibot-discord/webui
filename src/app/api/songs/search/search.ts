import { createHash } from "node:crypto";
import {
	MATCH_TIERS,
	type MatchKind,
	rankSongs,
	type SongMatch,
} from "@/lib/song-search";
import {
	ALIAS_MAX_LEN,
	type AliasIndex,
	type AliasLayer,
	type LiveStatus,
	resolveAliasLive,
} from "@/server/aliases";
import { type ChartSummary, chartCatalog } from "@/server/charts";
import { etagMatches, jsonError } from "@/server/http";
import { clientIp } from "@/server/rate-limit";

export const SEARCH_LIMIT_MAX = 25;
const SEARCH_LIMIT_DEFAULT = 10;
const CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";
/** Bundled-only aliases or a live lookup still running: ask again soon */
const CACHE_SHORT = "public, max-age=0, s-maxage=15, stale-while-revalidate=60";

export type SongSearchQuery = { q: string; limit: number; exact: boolean };

export type SongSearchResult = {
	id: string;
	song: string;
	composer: string;
	match: {
		tier: (typeof MATCH_TIERS)[number];
		kind: MatchKind;
		text: string;
		score: number;
		live?: true;
	};
	aliases: { text: string; layer: AliasLayer }[];
	charts: ChartSummary["charts"];
};

export type SongSearchBody = {
	q: string;
	rev: string;
	stale: boolean;
	live: LiveStatus;
	results: SongSearchResult[];
};

export type SongSearchDeps = {
	catalog: () => Promise<{ list: ChartSummary[]; aliases: AliasIndex }>;
	live: (
		q: string,
		client?: string,
	) => Promise<{ status: LiveStatus; ids: string[] }>;
};

const defaultDeps: SongSearchDeps = {
	catalog: chartCatalog,
	live: resolveAliasLive,
};

export function parseSongSearch(
	params: URLSearchParams,
): SongSearchQuery | { error: string; code: string } {
	const q = (params.get("q") ?? "").trim();
	if (!q || q.length > ALIAS_MAX_LEN) {
		return { error: "q must be 1-64 characters", code: "bad_query" };
	}
	const rawLimit = params.get("limit");
	let limit = SEARCH_LIMIT_DEFAULT;
	if (rawLimit != null) {
		limit = /^\d{1,3}$/.test(rawLimit) ? Number(rawLimit) : 0;
		if (limit < 1 || limit > SEARCH_LIMIT_MAX) {
			return { error: "limit must be 1-25", code: "bad_limit" };
		}
	}
	const rawExact = params.get("exact");
	if (rawExact != null && !["0", "1", "true", "false"].includes(rawExact)) {
		return { error: "exact must be 0 or 1", code: "bad_exact" };
	}
	return { q, limit, exact: rawExact === "1" || rawExact === "true" };
}

function result(
	m: SongMatch<ChartSummary>,
	aliases: AliasIndex,
	live = false,
): SongSearchResult {
	return {
		id: m.song.id,
		song: m.song.song,
		composer: m.song.composer,
		match: {
			tier: MATCH_TIERS[m.tier],
			kind: m.via.kind,
			text: m.via.text,
			score: Math.round(m.score * 1000) / 1000,
			...(live ? { live: true as const } : {}),
		},
		aliases: (aliases.byId.get(m.song.id) ?? []).map(({ text, layer }) => ({
			text,
			layer,
		})),
		charts: m.song.charts,
	};
}

/** Asks phib19's resolve (cached, ≤3 s) only while a published snapshot is not loaded yet */
export async function searchSongs(
	query: SongSearchQuery,
	deps: SongSearchDeps = defaultDeps,
	client?: string,
): Promise<SongSearchBody> {
	const { list, aliases } = await deps.catalog();
	const matches = rankSongs(list, query.q, {
		limit: query.limit,
		exact: query.exact,
	});
	let live: LiveStatus = "skipped";
	const exactHit = matches.some((m) => m.tier === 0);
	let liveHits: SongMatch<ChartSummary>[] = [];
	if (!exactHit && aliases.stale) {
		const res = await deps.live(query.q, client);
		live = res.status;
		const wanted = new Set(res.ids);
		liveHits = list
			.filter((song) => wanted.has(song.id))
			.map((song) => ({
				song,
				tier: 0,
				score: 1,
				via: { kind: "alias", text: query.q },
			}));
	}
	const liveIds = new Set(liveHits.map((m) => m.song.id));
	const results = [
		...liveHits.map((m) => result(m, aliases, true)),
		...matches
			.filter((m) => !liveIds.has(m.song.id))
			.map((m) => result(m, aliases)),
	].slice(0, query.limit);
	return { q: query.q, rev: aliases.rev, stale: aliases.stale, live, results };
}

export async function songSearchResponse(
	request: Request,
	deps: SongSearchDeps = defaultDeps,
): Promise<Response> {
	const query = parseSongSearch(new URL(request.url).searchParams);
	if ("error" in query) return jsonError(400, query.error, query.code);
	const body = await searchSongs(query, deps, clientIp(request.headers));
	const json = JSON.stringify(body);
	const hash = createHash("sha1").update(json).digest("hex").slice(0, 16);
	const etag = `songs-${hash}`;
	const transient =
		body.stale || body.live === "timeout" || body.live === "error";
	const headers = {
		ETag: `"${etag}"`,
		"Cache-Control": transient ? CACHE_SHORT : CACHE,
	};
	if (etagMatches(request.headers.get("if-none-match"), etag)) {
		return new Response(null, { status: 304, headers });
	}
	return new Response(json, {
		status: 200,
		headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
	});
}
