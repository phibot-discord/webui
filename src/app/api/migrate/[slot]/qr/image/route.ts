import { authed } from "@/server/authed";
import { qrPngResponse } from "@/server/i18n-http";
import { asSlot, migrateQrPng } from "@/server/migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	_request: Request,
	ctx: { params: Promise<{ slot: string }> },
) {
	const slot = asSlot((await ctx.params).slot);
	if (!slot) return new Response("not found", { status: 404 });
	return authed(async (userId) =>
		qrPngResponse(await migrateQrPng(userId, slot)),
	);
}
