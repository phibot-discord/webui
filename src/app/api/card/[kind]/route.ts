import { negotiateLocale } from "@/i18n/config";
import { cookieLocale, localeSetCookie } from "@/i18n/server";
import { parsePhiLocale } from "@/phi/lib/card-i18n";
import { authed } from "@/server/authed";
import { cardDownloadFilename } from "@/server/cache";
import {
	clampCount,
	isCardKind,
	RENDER_VERSION,
	renderCard,
} from "@/server/cards";
import { cardResultResponse, wantsReload } from "@/server/http";
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

/** Stored by the browser but revalidated every time: a revisit is a 304 against the ETag */
const PRIVATE_CACHE = "private, no-cache";

export async function GET(
	request: Request,
	ctx: { params: Promise<{ kind: string }> },
) {
	return authed(async (userId) => {
		const { kind } = await ctx.params;
		if (!isCardKind(kind)) return localizedError(404, "unknown_card");

		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");

		const url = new URL(request.url);
		const count = clampCount(url.searchParams.get("count"));
		const tags = url.searchParams.get("tags");
		const stats = url.searchParams.get("stats");
		const qualityParam = url.searchParams.get("quality");
		const download = url.searchParams.get("download") === "1";
		const acceptLanguage = request.headers.get("accept-language");
		const uiCookie = cookieLocale(request.headers);
		const result = await renderCard(userId, kind, {
			count,
			// ?locale, Accept-Language, the UI cookie, then (inside renderCard) the
			// saved notes locale, then the negotiated Accept-Language
			locale:
				parsePhiLocale(url.searchParams.get("locale")) ??
				parsePhiLocale(acceptLanguage) ??
				uiCookie,
			fallbackLocale: negotiateLocale(undefined, acceptLanguage),
			ifNoneMatch: download ? null : request.headers.get("if-none-match"),
			paintQuality:
				qualityParam == null ? undefined : parsePaintQuality(qualityParam),
			showTagAnalysis: tags === "1" ? true : tags === "0" ? false : undefined,
			showRecordStats: stats === "1" ? true : stats === "0" ? false : undefined,
			download,
			epoch: url.searchParams.get("epoch") ?? undefined,
			style: url.searchParams.get("style") ?? undefined,
			chart: url.searchParams.get("chart") ?? undefined,
			level: url.searchParams.get("level") ?? undefined,
			// Sent right after a refresh or manual save: another instance may still
			// remember the old save for a few seconds
			fresh: wantsReload(request.headers),
		});
		if ("error" in result) return localizedRenderError(result);
		const res = cardResultResponse(result, {
			cacheControl: result.transient ? "no-store" : PRIVATE_CACHE,
			request,
			filename: download ? cardDownloadFilename(kind) : undefined,
			renderVersion: RENDER_VERSION,
		});
		// Pages pick the chrome locale from this cookie only; seed it from the notes we just read
		if (!uiCookie && result.uiLocale) {
			res.headers.append("Set-Cookie", localeSetCookie(result.uiLocale));
		}
		return res;
	});
}
