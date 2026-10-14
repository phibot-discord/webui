import { authed } from "@/server/authed";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");

		const host = await getDataHost();
		const token = await host.lib.getToken(host.rt, userId);
		if (!token) return localizedError(404, "not_bound");
		return Response.json(
			{ token },
			{ headers: { "Cache-Control": "no-store" } },
		);
	});
}
