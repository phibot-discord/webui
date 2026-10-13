import { authed } from "@/server/authed";
import {
	loadBound,
	playerFromSave,
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
				bound: got.error === "no_save",
				banned: got.error === "banned",
				hasSave: false,
				error: got.error,
				shareSlug,
				refreshCooldownMs,
			});
		}
		return Response.json({
			bound: true,
			banned: false,
			hasSave: true,
			manual: got.manual === true,
			...playerFromSave(got.save),
			shareSlug,
			refreshCooldownMs,
		});
	});
}
