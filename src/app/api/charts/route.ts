import {
	chartCatalog,
	chartCatalogWithFools,
	songCatalog,
} from "@/server/charts";
import { jsonEtagResponse } from "@/server/http";
import { localizedRetryAfter } from "@/server/i18n-http";
import { clientIp, rateLimitBy } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";
/** Cold start served the bundled aliases only; the approved ones are a few seconds out */
const CACHE_STALE = "public, max-age=30, stale-while-revalidate=300";

export async function GET(request: Request) {
	const limited = rateLimitBy(`charts:${clientIp(request.headers)}`, 60);
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	// `?fools=1` adds the 4/1 specials: the Phira and asset pages ask, the scoring tools do not
	const params = new URL(request.url).searchParams;
	const { json, etag, aliases } = await (params.get("fools") === "1"
		? chartCatalogWithFools()
		: params.get("songs") === "1"
			? songCatalog()
			: chartCatalog());
	// chartCatalog's etag is already quoted
	return jsonEtagResponse(
		request,
		json,
		etag.slice(1, -1),
		aliases.stale ? CACHE_STALE : CACHE,
	);
}
