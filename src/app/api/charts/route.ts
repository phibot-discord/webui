import { chartCatalog } from "@/server/charts";
import { etagMatches } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = "public, max-age=300, stale-while-revalidate=86400";

export async function GET(request: Request) {
	const { json, etag } = await chartCatalog();
	const headers = { ETag: etag, "Cache-Control": CACHE };
	if (etagMatches(request.headers.get("if-none-match"), etag.slice(1, -1))) {
		return new Response(null, { status: 304, headers });
	}
	return new Response(json, {
		status: 200,
		headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
	});
}
