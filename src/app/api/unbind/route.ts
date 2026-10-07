import { authed } from "@/server/authed";
import { unbindAccount } from "@/server/bind";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");

		const result = await unbindAccount(userId);
		if ("error" in result) return localizedError(result.status, result.error);
		return Response.json({ ok: true });
	});
}
