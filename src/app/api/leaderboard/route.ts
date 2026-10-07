import { leaderboardJson, parseLeaderboardQuery } from "@/phi/lib/leaderboard";
import { chartCell } from "@/server/charts";
import { localizedRetryAfter } from "@/server/i18n-http";
import { logger } from "@/server/logger";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { ensureSongInfo } from "@/server/song-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A late lookup keeps running after the 503 (after()): one phib19 attempt is ≤ 25 s */
export const maxDuration = 60;

/** Ranks move slowly; one answer per (chart, level, acc) is fine to share for minutes */
const CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
const CACHE_NO_DATA = "public, max-age=60, s-maxage=300";
/** phib19 often needs seconds; past this the lookup keeps filling the cache and we answer 503 */
const BUDGET_MS = 6_000;

/**
 * GET /api/leaderboard?chart=&level=&acc=[&minRks=&maxRks=]: where `acc` would place among
 * phib19's anonymous records. Upstream trouble or too many uncached lookups is a 503, never a 500
 */
export async function GET(request: Request) {
	// Its own bucket: a page calling this repeatedly must not use up the IP's card renders
	const limited = rateLimit({ ip: `lb:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	try {
		await ensureSongInfo();
		const query = parseLeaderboardQuery(
			new URL(request.url).searchParams,
			(id, level) => Boolean(chartCell(id, level)),
		);
		if (!query) {
			return Response.json(
				{ error: "bad_request" },
				{ status: 400, headers: { "Cache-Control": "no-store" } },
			);
		}
		const res = await leaderboardJson(query, { budgetMs: BUDGET_MS });
		const headers: Record<string, string> =
			res.status === 200
				? { "Cache-Control": CACHE }
				: res.status === 404
					? { "Cache-Control": CACHE_NO_DATA }
					: { "Cache-Control": "no-store", "Retry-After": "30" };
		return Response.json(res.body, { status: res.status, headers });
	} catch (err) {
		logger.warn(
			`leaderboard route: ${err instanceof Error ? err.message : err}`,
		);
		return Response.json(
			{ error: "upstream_unavailable" },
			{
				status: 503,
				headers: { "Cache-Control": "no-store", "Retry-After": "30" },
			},
		);
	}
}
