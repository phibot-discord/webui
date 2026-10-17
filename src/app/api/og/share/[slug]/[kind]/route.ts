import { isLocale } from "@/i18n/config";
import { ogPageUrl } from "@/lib/og";
import { isPublicKind } from "@/server/cards";
import { localizedError } from "@/server/i18n-http";
import { withDiscordUid } from "@/server/logger";
import { cardOgImage, cardOgResponse, ogRedirect } from "@/server/og";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { userIdForSlug } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(
	request: Request,
	ctx: { params: Promise<{ slug: string; kind: string }> },
) {
	const { slug, kind } = await ctx.params;
	if (!isPublicKind(kind)) return localizedError(404, "unknown_card");
	const raw = new URL(request.url).searchParams.get("lang");
	const locale = isLocale(raw) ? raw : "en";
	// Chat crawlers share a few addresses: past the limit they get the generic image, not an error
	const limited = rateLimit({ ip: clientIp(request.headers) });
	if (!limited.ok) return ogRedirect(ogPageUrl("cards", locale));
	const userId = await userIdForSlug(slug);
	if (!userId) return localizedError(404, "share_not_found");
	return withDiscordUid(userId, () =>
		cardOgResponse(
			cardOgImage(userId, kind, locale),
			ogPageUrl("cards", locale),
		),
	);
}
