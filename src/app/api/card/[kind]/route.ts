import { sessionUserId } from "@/auth";
import { getMessages } from "@/i18n/server";
import { clampCount, isCardKind, renderCard } from "@/server/cards";
import { getDataHost } from "@/server/data-host";
import { pngResponse } from "@/server/http";
import {
	localizedError,
	localizedRenderError,
	localizedRetryAfter,
} from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PRIVATE_CACHE = "private, max-age=60, must-revalidate";

export async function GET(
	request: Request,
	ctx: { params: Promise<{ kind: string }> },
) {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const { kind } = await ctx.params;
	if (!isCardKind(kind)) return localizedError(404, "unknown_card");

	const host = await getDataHost();
	const limited = await rateLimit(host.store, {
		userId,
		ip: clientIp(request.headers),
	});
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");

	const url = new URL(request.url);
	const count = clampCount(url.searchParams.get("count"));
	const { locale } = await getMessages();
	const result = await renderCard(userId, kind, { count, locale });
	if ("error" in result) return localizedRenderError(result);
	return pngResponse(result.bytes, {
		etag: result.etag,
		cacheControl: PRIVATE_CACHE,
		request,
	});
}
