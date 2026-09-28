import { authed } from "@/server/authed";
import { bypassCardCache } from "@/server/bound";
import { localizedRenderError } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
	return authed(async (userId) => {
		const result = await bypassCardCache(userId);
		if ("error" in result) return localizedRenderError(result);
		return Response.json({
			ok: true,
			epoch: result.epoch,
			cooldownMs: result.cooldownMs,
		});
	});
}
