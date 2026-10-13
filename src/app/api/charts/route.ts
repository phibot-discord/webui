import { chartCatalog, chartCatalogWithFools } from "@/server/charts";
import { jsonEtagResponse } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = "public, max-age=300, stale-while-revalidate=86400";
/** Cold start served the bundled aliases only; the approved ones are a few seconds out */
const CACHE_STALE = "public, max-age=30, stale-while-revalidate=300";

export async function GET(request: Request) {
	// `?fools=1` adds the 4/1 specials: the Phira and asset pages ask, the scoring tools do not
	const withFools = new URL(request.url).searchParams.get("fools") === "1";
	const { json, etag, aliases } = await (withFools
		? chartCatalogWithFools()
		: chartCatalog());
	// chartCatalog's etag is already quoted
	return jsonEtagResponse(
		request,
		json,
		etag.slice(1, -1),
		aliases.stale ? CACHE_STALE : CACHE,
	);
}
