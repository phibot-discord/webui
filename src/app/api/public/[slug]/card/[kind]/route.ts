import { resolvePhiLocale } from "@/phi/lib/card-i18n";
import { isPublicKind, renderCard } from "@/server/cards";
import { getDataHost } from "@/server/data-host";
import { pngResponse } from "@/server/http";
import {
	localizedError,
	localizedRenderError,
	localizedRetryAfter,
} from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { userIdForSlug } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PUBLIC_CACHE = "public, s-maxage=300, stale-while-revalidate=86400";

export async function GET(
	request: Request,
	ctx: { params: Promise<{ slug: string; kind: string }> },
) {
	const { slug, kind } = await ctx.params;
	if (!isPublicKind(kind)) return localizedError(404, "unknown_card");
	const userId = await userIdForSlug(slug);
	if (!userId) return localizedError(404, "share_not_found");

	const host = await getDataHost();
	const limited = await rateLimit(host.store, {
		ip: clientIp(request.headers),
	});
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");

	const url = new URL(request.url);
	const locale = resolvePhiLocale(
		url.searchParams.get("locale"),
		request.headers.get("accept-language"),
	);
	const result = await renderCard(userId, kind, { locale });
	if ("error" in result) return localizedRenderError(result);
	return pngResponse(result.bytes, {
		etag: result.etag,
		cacheControl: PUBLIC_CACHE,
		request,
	});
}
