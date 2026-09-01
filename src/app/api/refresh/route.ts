import { sessionUserId } from "@/auth";
import { refreshSave } from "@/server/bound";
import { localizedError, localizedRenderError } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const result = await refreshSave(userId);
	if ("error" in result) return localizedRenderError(result);
	return Response.json({ ok: true, lastSynced: result.lastSynced });
}
