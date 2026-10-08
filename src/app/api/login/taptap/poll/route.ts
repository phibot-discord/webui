import { tapLoginIdFrom } from "@/server/auth-tickets";
import { isQrResume } from "@/server/bind";
import {
	localizedBindError,
	localizedError,
	localizedErrorBody,
} from "@/server/i18n-http";
import { finishTapLogin, peekTapLogin } from "@/server/tap-login";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** `ready` carries the ticket the sign-in form posts; the save is already bound */
export async function POST(request: Request) {
	const loginId = tapLoginIdFrom(request.headers);
	if (!loginId) return localizedError(404, "qr_missing");
	const peeked = await peekTapLogin(loginId);
	if (isQrResume(peeked)) {
		return tapWaitNdjson(
			"-",
			async () => {
				const result = await finishTapLogin(loginId, peeked.resume);
				if ("error" in result) return localizedErrorBody(result);
				return { status: "ready", ...result };
			},
			{ error: "bind_failed", code: "bind_failed", status: 502 },
		);
	}
	if ("error" in peeked) return localizedBindError(peeked);
	return Response.json(peeked);
}
