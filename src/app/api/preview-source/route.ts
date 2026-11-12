import { objectUrls } from "@/server/asset-links";
import { chartCatalog } from "@/server/charts";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { loadIllLevels } from "@/server/ill-levels";
import { previewItem } from "@/server/preview-source";
import { clientIp, rateLimitBy } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const limited = rateLimitBy(`preview:${clientIp(request.headers)}`, 60);
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const params = new URL(request.url).searchParams;
	const id = params.get("id") ?? "";
	const rank = params.get("rank") ?? "";
	if (!id || id.length > 200) return codeError(400, "bad_request");
	const [{ list }, perLevel, links] = await Promise.all([
		chartCatalog(),
		loadIllLevels().catch(() => new Map<string, string[]>()),
		objectUrls(),
	]);
	const item = previewItem(list, perLevel, links, id, rank);
	if (!item) return codeError(404, "not_found");
	return Response.json(item, {
		headers: { "Cache-Control": "private, max-age=300" },
	});
}
