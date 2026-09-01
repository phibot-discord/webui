import { sessionUserId } from "@/auth";
import { unbindAccount } from "@/server/bind";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const host = await getDataHost();
	const limited = await rateLimit(host.store, {
		userId,
		ip: clientIp(request.headers),
	});
	if (!limited.ok) return localizedError(429, "rate_limit");

	const result = await unbindAccount(userId);
	if ("error" in result) return localizedError(result.status, result.error);
	return Response.json({ ok: true });
}
