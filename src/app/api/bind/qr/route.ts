import { sessionUserId } from "@/auth";
import { startQrBind } from "@/server/bind";
import { getDataHost } from "@/server/data-host";
import { localizedBindError, localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const host = await getDataHost();
	const limited = await rateLimit(host.store, {
		userId,
		ip: clientIp(request.headers),
	});
	if (!limited.ok) return localizedError(429, "rate_limit");

	const body = (await request.json().catch(() => ({}))) as { server?: string };
	const result = await startQrBind(userId, body.server);
	if ("error" in result) return localizedBindError(result);
	return Response.json(result);
}
