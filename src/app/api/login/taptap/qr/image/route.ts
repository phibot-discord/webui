import { tapLoginIdFrom } from "@/server/auth-tickets";
import { localizedError } from "@/server/i18n-http";
import { tapLoginQrPng } from "@/server/tap-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const loginId = tapLoginIdFrom(request.headers);
	if (!loginId) return localizedError(404, "qr_missing");
	const result = await tapLoginQrPng(loginId);
	if ("error" in result) return localizedError(result.status, result.error);
	return new Response(new Uint8Array(result), {
		status: 200,
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "private, no-store",
		},
	});
}
