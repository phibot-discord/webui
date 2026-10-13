import { sessionUserId } from "@/auth";
import { loadBound, playerFromSave } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
import { withDiscordUid } from "@/server/logger";
import { userIdForSlug } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	_request: Request,
	ctx: { params: Promise<{ slug: string }> },
) {
	const { slug } = await ctx.params;
	const userId = await userIdForSlug(slug);
	if (!userId) return localizedError(404, "share_not_found");
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const got = await loadBound(host, userId);
		if ("error" in got)
			return localizedError(
				got.status === 403 ? 404 : got.status,
				"profile_unavailable",
			);
		const player = playerFromSave(got.save);
		const viewer = await sessionUserId();
		return Response.json({ ...player, owner: viewer === userId });
	});
}
