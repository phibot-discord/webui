import { isChartId, isPackLevel } from "@/lib/chart-catalog";
import { CURRENT, chartStatsKey, loadChartStats } from "@/server/chart-stats";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERSION = /^[\d.]+(?:-\d+)?$/;

export async function GET(request: Request) {
	const limited = rateLimit({ ip: `cs:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const params = new URL(request.url).searchParams;
	const id = (params.get("id") || "").trim();
	const level = (params.get("level") || "").trim();
	const ver = (params.get("ver") || CURRENT).trim();
	if (
		!isChartId(id) ||
		!isPackLevel(level) ||
		(ver !== CURRENT && !VERSION.test(ver))
	) {
		return codeError(400, "bad_request");
	}
	const key = await chartStatsKey(id, level, ver);
	const stats = key ? await loadChartStats(key) : undefined;
	if (!stats) {
		return codeError(404, "not_found", {
			stable: true,
			headers: { "Cache-Control": "public, max-age=300" },
		});
	}
	return Response.json(stats, {
		headers: {
			"Cache-Control":
				ver === CURRENT
					? "public, max-age=300, s-maxage=3600, stale-while-revalidate=3600"
					: "public, max-age=86400, s-maxage=31536000, immutable",
		},
	});
}
