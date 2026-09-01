import { sessionUserId } from "@/auth";
import {
	lastSyncedIso,
	loadBound,
	refreshCooldownRemaining,
} from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
import { getShareSlug } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const host = await getDataHost();
	const shareSlug = await getShareSlug(userId);
	const refreshCooldownMs = await refreshCooldownRemaining(userId);
	const got = await loadBound(host, userId);
	if ("error" in got) {
		return Response.json({
			bound: got.reason === "no_save",
			banned: got.reason === "banned",
			hasSave: false,
			error: got.error,
			shareSlug,
			refreshCooldownMs,
		});
	}
	const rks = got.save.saveInfo.summary?.rankingScore;
	return Response.json({
		bound: true,
		banned: false,
		hasSave: true,
		playerId: String(got.save.saveInfo.PlayerId || ""),
		rks: typeof rks === "number" ? rks : undefined,
		lastSynced: lastSyncedIso(got.save),
		shareSlug,
		refreshCooldownMs,
	});
}
