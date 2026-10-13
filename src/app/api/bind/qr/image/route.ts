import { authed } from "@/server/authed";
import { qrPng } from "@/server/bind";
import { qrPngResponse } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) => qrPngResponse(await qrPng(userId)));
}
