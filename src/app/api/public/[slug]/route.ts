import { sessionUserId } from "@/auth";
import { lastSyncedIso, loadBound } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
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
	const host = await getDataHost();
	const got = await loadBound(host, userId);
	if ("error" in got)
		return localizedError(
			got.status === 403 ? 404 : got.status,
			"profile_unavailable",
		);
	const rks = got.save.saveInfo.summary?.rankingScore;
	const viewer = await sessionUserId();
	return Response.json({
		playerId: String(got.save.saveInfo.PlayerId || ""),
		rks: typeof rks === "number" ? rks : undefined,
		lastSynced: lastSyncedIso(got.save),
		owner: viewer === userId,
	});
}
