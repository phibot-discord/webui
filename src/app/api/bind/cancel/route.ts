import { sessionUserId } from "@/auth";
import { cancelQrBind } from "@/server/bind";
import { localizedError } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const result = await cancelQrBind(userId);
	return Response.json(result);
}
