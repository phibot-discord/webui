import { authed } from "@/server/authed";
import { localizedError, localizedErrorBody } from "@/server/i18n-http";
import { boundAsFrom } from "@/server/migrate";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");

		return tapWaitNdjson(
			userId,
			async () => {
				const result = await boundAsFrom(userId);
				if ("error" in result) return localizedErrorBody(result);
				return { status: "ready", ...result };
			},
			{ error: "migrate_failed", code: "migrate_failed", status: 502 },
		);
	});
}
