import { authed } from "@/server/authed";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { loadSimBase } from "@/server/simulation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The save the site holds right now, for the simulation's "Sync to latest save" */
export async function GET(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");

		const got = await loadSimBase(await getDataHost(), userId);
		if ("error" in got) return localizedError(got.status, got.error);
		return Response.json(got, { headers: { "Cache-Control": "no-store" } });
	});
}
