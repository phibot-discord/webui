import { getMessages } from "@/i18n/server";
import { resolvePhiLocale } from "@/phi/lib/card-i18n";
import { authed } from "@/server/authed";
import { cardDownloadFilename } from "@/server/cache";
import {
	clampCount,
	isCardKind,
	RENDER_VERSION,
	renderCard,
} from "@/server/cards";
import { getDataHost } from "@/server/data-host";
import { cardResultResponse } from "@/server/http";
import {
	localizedError,
	localizedRenderError,
	localizedRetryAfter,
} from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { parsePaintQuality } from "@/server/render/paint-budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const PRIVATE_CACHE = "no-store";

export async function GET(
	request: Request,
	ctx: { params: Promise<{ kind: string }> },
) {
	return authed(async (userId) => {
		const { kind } = await ctx.params;
		if (!isCardKind(kind)) return localizedError(404, "unknown_card");

		const host = await getDataHost();
		const limited = await rateLimit(host.store, {
			userId,
			ip: clientIp(request.headers),
		});
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");

		const url = new URL(request.url);
		const count = clampCount(url.searchParams.get("count"));
		const tags = url.searchParams.get("tags");
		const stats = url.searchParams.get("stats");
		const qualityParam = url.searchParams.get("quality");
		const download = url.searchParams.get("download") === "1";
		const locale = resolvePhiLocale(
			url.searchParams.get("locale"),
			request.headers.get("accept-language"),
			(await getMessages()).locale,
		);
		const result = await renderCard(userId, kind, {
			count,
			locale,
			ifNoneMatch: download ? null : request.headers.get("if-none-match"),
			paintQuality:
				qualityParam == null ? undefined : parsePaintQuality(qualityParam),
			showTagAnalysis: tags === "1" ? true : tags === "0" ? false : undefined,
			showRecordStats: stats === "1" ? true : stats === "0" ? false : undefined,
			download,
			epoch: url.searchParams.get("epoch") ?? undefined,
		});
		if ("error" in result) return localizedRenderError(result);
		return cardResultResponse(result, {
			cacheControl: PRIVATE_CACHE,
			request,
			filename: download ? cardDownloadFilename(kind) : undefined,
			renderVersion: RENDER_VERSION,
		});
	});
}
