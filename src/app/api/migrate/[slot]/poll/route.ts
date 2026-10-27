import { authed } from "@/server/authed";
import { localizedBindError, localizedErrorBody } from "@/server/i18n-http";
import { asSlot, finishMigrateQr, peekMigrateQr } from "@/server/migrate";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(
	_request: Request,
	ctx: { params: Promise<{ slot: string }> },
) {
	const slot = asSlot((await ctx.params).slot);
	if (!slot) return new Response("not found", { status: 404 });
	return authed(async (userId) => {
		const peeked = await peekMigrateQr(userId, slot);
		if ("resume" in peeked) {
			return tapWaitNdjson(
				userId,
				async () => {
					const result = await finishMigrateQr(userId, slot, peeked.resume);
					if ("error" in result) return localizedErrorBody(result);
					return result;
				},
				"migrate_failed",
			);
		}
		if ("error" in peeked) return localizedBindError(peeked);
		return Response.json(peeked);
	});
}
