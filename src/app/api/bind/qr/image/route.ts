import { authed } from "@/server/authed";
import { qrPng } from "@/server/bind";
import { localizedError } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) => {
		const result = await qrPng(userId);
		if ("error" in result) return localizedError(result.status, result.error);
		return new Response(new Uint8Array(result), {
			status: 200,
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "private, no-store",
			},
		});
	});
}
