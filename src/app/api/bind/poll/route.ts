import { authed } from "@/server/authed";
import { finishQrBind, isQrResume, peekQrBind } from "@/server/bind";
import { localizedBindError, localizedErrorBody } from "@/server/i18n-http";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST() {
	return authed(async (userId) => {
		const peeked = await peekQrBind(userId);
		if (isQrResume(peeked)) {
			return tapWaitNdjson(
				userId,
				async () => {
					const result = await finishQrBind(userId, peeked.resume);
					if ("error" in result) return localizedErrorBody(result);
					return { status: "bound", ...result };
				},
				{ error: "bind_failed", code: "bind_failed", status: 502 },
			);
		}
		if ("error" in peeked) return localizedBindError(peeked);
		if ("status" in peeked) return Response.json(peeked);
		return Response.json({ status: "bound", ...peeked });
	});
}
