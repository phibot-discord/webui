import { authed } from "@/server/authed";
import {
	lastSyncedIso,
	loadBound,
	refreshCooldownRemaining,
} from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { getShareSlug } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) => {
		const host = await getDataHost();
		const [shareSlug, refreshCooldownMs, got] = await Promise.all([
			getShareSlug(userId),
			refreshCooldownRemaining(userId),
			loadBound(host, userId),
		]);
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
			manual: got.manual === true,
			playerId: String(got.save.saveInfo.PlayerId || ""),
			rks: typeof rks === "number" ? rks : undefined,
			lastSynced: lastSyncedIso(got.save),
			shareSlug,
			refreshCooldownMs,
		});
	});
}
