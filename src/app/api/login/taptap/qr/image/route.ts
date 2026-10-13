import { tapLoginIdFrom } from "@/server/auth-tickets";
import { localizedError, qrPngResponse } from "@/server/i18n-http";
import { tapLoginQrPng } from "@/server/tap-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const loginId = tapLoginIdFrom(request.headers);
	if (!loginId) return localizedError(404, "qr_missing");
	return qrPngResponse(await tapLoginQrPng(loginId));
}
