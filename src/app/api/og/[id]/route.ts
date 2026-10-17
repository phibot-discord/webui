import { isLocale } from "@/i18n/config";
import { isOgPage } from "@/lib/og";
import {
	cardOgImage,
	cardOgResponse,
	jpegResponse,
	ogRedirect,
	STATIC_OG,
	TITLE_CARD_CACHE,
	titleCardImage,
} from "@/server/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
	request: Request,
	ctx: { params: Promise<{ id: string }> },
) {
	const { id } = await ctx.params;
	if (!isOgPage(id)) return new Response(null, { status: 404 });
	const raw = new URL(request.url).searchParams.get("lang");
	const locale = isLocale(raw) ? raw : "en";
	if (id === "home") {
		const owner = process.env.PHI_OG_UID?.trim();
		if (!owner) return ogRedirect(STATIC_OG);
		return cardOgResponse(cardOgImage(owner, "b30", locale), STATIC_OG);
	}
	try {
		return jpegResponse(await titleCardImage(id, locale), TITLE_CARD_CACHE);
	} catch {
		return ogRedirect(STATIC_OG);
	}
}
