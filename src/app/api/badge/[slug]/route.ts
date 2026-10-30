import { badgeSvg, parseBadgeStyle } from "@/lib/badge";
import { displayPlayerId } from "@/lib/player-display";
import { loadBound } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { withDiscordUid } from "@/server/logger";
import { userIdForSlug } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE =
	"public, max-age=600, s-maxage=1800, stale-while-revalidate=86400";

function svg(body: string, status: number, cache: string) {
	return new Response(body, {
		status,
		headers: {
			"Content-Type": "image/svg+xml; charset=utf-8",
			"Cache-Control": cache,
			"Content-Security-Policy":
				"default-src 'none'; style-src 'unsafe-inline'",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

export async function GET(
	request: Request,
	ctx: { params: Promise<{ slug: string }> },
) {
	const { slug } = await ctx.params;
	const style = parseBadgeStyle(new URL(request.url).searchParams.get("style"));
	const id = slug.replace(/\.svg$/, "");
	const userId = await userIdForSlug(id);
	const missing = () =>
		svg(
			badgeSvg({ name: "PhiBot" }, style),
			404,
			"public, max-age=300, s-maxage=300",
		);
	if (!userId) return missing();
	return withDiscordUid(userId, async () => {
		const got = await loadBound(await getDataHost(), userId, { memo: true });
		if ("error" in got) return missing();
		const summary = got.save.saveInfo.summary;
		return svg(
			badgeSvg(
				{
					name: displayPlayerId(got.save.saveInfo.PlayerId),
					rks: summary?.rankingScore,
					challenge: summary?.challengeModeRank,
				},
				style,
			),
			200,
			CACHE,
		);
	});
}
