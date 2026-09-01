import { sessionUserId } from "@/auth";
import { qrPng } from "@/server/bind";
import { localizedError } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const result = await qrPng(userId);
	if ("error" in result) return localizedError(result.status, result.error);
	return new Response(new Uint8Array(result), {
		status: 200,
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "private, no-store",
		},
	});
}
