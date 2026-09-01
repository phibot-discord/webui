import { sessionUserId } from "@/auth";
import { catalogs, getRequestLocale } from "@/i18n/server";
import { bindWithToken } from "@/server/bind";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const host = await getDataHost();
	const limited = await rateLimit(host.store, {
		userId,
		ip: clientIp(request.headers),
	});
	if (!limited.ok) return localizedError(429, "rate_limit");

	const body = (await request.json().catch(() => ({}))) as {
		token?: string;
		server?: string;
	};
	const result = await bindWithToken(userId, body.token, body.server);
	if ("error" in result) {
		if (result.detail) {
			const locale = await getRequestLocale();
			const message = catalogs[locale].errors[result.error];
			return Response.json(
				{ error: `${message} ${result.detail}`, code: result.error },
				{ status: result.status },
			);
		}
		return localizedError(result.status, result.error);
	}
	return Response.json({ status: "bound", ...result });
}
