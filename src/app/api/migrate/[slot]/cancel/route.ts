import { authed } from "@/server/authed";
import { asSlot, clearMigrateQr } from "@/server/migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
	_request: Request,
	ctx: { params: Promise<{ slot: string }> },
) {
	const slot = asSlot((await ctx.params).slot);
	if (!slot) return new Response("not found", { status: 404 });
	return authed(async (userId) => {
		await clearMigrateQr(userId, slot);
		return Response.json({ ok: true });
	});
}
