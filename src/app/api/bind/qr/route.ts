import { authed } from "@/server/authed";
import { startQrBind } from "@/server/bind";
import { localizedError, localizedErrorBody } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");

		const body = (await request.json().catch(() => ({}))) as {
			server?: string;
			global?: boolean;
		};
		return tapWaitNdjson(
			userId,
			async () => {
				const result = await startQrBind(userId, body.server, body.global);
				if ("error" in result) return localizedErrorBody(result);
				return result;
			},
			{ error: "bind_failed", code: "bind_failed", status: 502 },
		);
	});
}
