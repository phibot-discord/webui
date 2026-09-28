import { resolvePhiLocale } from "@/phi/lib/card-i18n";
import { cardDownloadFilename } from "@/server/cache";
import { isPublicKind, renderCard } from "@/server/cards";
import { getDataHost } from "@/server/data-host";
import { cardResultResponse } from "@/server/http";
import {
	localizedError,
	localizedRenderError,
	localizedRetryAfter,
} from "@/server/i18n-http";
import { withDiscordUid } from "@/server/logger";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { parsePaintQuality } from "@/server/render/paint-budget";
import { userIdForSlug } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const PUBLIC_CACHE = "public, s-maxage=300, stale-while-revalidate=86400";

export async function GET(
	request: Request,
	ctx: { params: Promise<{ slug: string; kind: string }> },
) {
	const { slug, kind } = await ctx.params;
	if (!isPublicKind(kind)) return localizedError(404, "unknown_card");
	const userId = await userIdForSlug(slug);
	if (!userId) return localizedError(404, "share_not_found");

	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const limited = await rateLimit(host.store, {
			ip: clientIp(request.headers),
		});
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");

		const url = new URL(request.url);
		const qualityParam = url.searchParams.get("quality");
		const download = url.searchParams.get("download") === "1";
		const result = await renderCard(userId, kind, {
			locale: resolvePhiLocale(
				url.searchParams.get("locale"),
				request.headers.get("accept-language"),
			),
			ifNoneMatch: download ? null : request.headers.get("if-none-match"),
			paintQuality:
				qualityParam == null ? undefined : parsePaintQuality(qualityParam),
			download,
		});
		if ("error" in result) return localizedRenderError(result);
		return cardResultResponse(result, {
			cacheControl: PUBLIC_CACHE,
			request,
			filename: download ? cardDownloadFilename(kind) : undefined,
		});
	});
}
