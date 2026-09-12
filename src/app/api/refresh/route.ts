import { sessionUserId } from "@/auth";
import { refreshSave } from "@/server/bound";
import { localizedError, localizedErrorBody } from "@/server/i18n-http";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	return tapWaitNdjson(
		async () => {
			const result = await refreshSave(userId);
			if ("error" in result) return localizedErrorBody(result);
			return {
				ok: true,
				lastSynced: result.lastSynced,
				epoch: result.epoch,
				cooldownMs: result.cooldownMs,
			};
		},
		{ error: "refresh_failed", code: "refresh_failed", status: 502 },
	);
}
