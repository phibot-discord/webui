import { sessionUserId } from "@/auth";
import { pollQrBind } from "@/server/bind";
import { localizedBindError, localizedError } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");

	const result = await pollQrBind(userId);
	if ("error" in result) return localizedBindError(result);
	if ("status" in result) return Response.json(result);
	return Response.json({ status: "bound", ...result });
}
