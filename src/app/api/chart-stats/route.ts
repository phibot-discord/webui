import { isPackLevel } from "@/lib/chart-catalog";
import { CURRENT, chartStatsKey, loadChartStats } from "@/server/chart-stats";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERSION = /^[\d.]+(?:-\d+)?$/;

export async function GET(request: Request) {
	const limited = rateLimit({ ip: `cs:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedError(429, "rate_limit");
	const params = new URL(request.url).searchParams;
	const id = (params.get("id") || "").trim();
	const level = (params.get("level") || "").trim();
	const ver = (params.get("ver") || CURRENT).trim();
	if (
		!id ||
		id.length > 160 ||
		!isPackLevel(level) ||
		(ver !== CURRENT && !VERSION.test(ver))
	) {
		return Response.json({ error: "bad_request" }, { status: 400 });
	}
	const key = await chartStatsKey(id, level, ver);
	const stats = key ? await loadChartStats(key) : undefined;
	if (!stats) {
		return Response.json(
			{ error: "not_found" },
			{ status: 404, headers: { "Cache-Control": "public, max-age=300" } },
		);
	}
	return Response.json(stats, {
		headers: {
			"Cache-Control":
				ver === CURRENT
					? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"
					: "public, max-age=86400, s-maxage=31536000, immutable",
		},
	});
}
