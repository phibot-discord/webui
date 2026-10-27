import { authed } from "@/server/authed";
import { localizedError, localizedErrorBody } from "@/server/i18n-http";
import { runMigrate } from "@/server/migrate";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");

		const body = (await request.json().catch(() => ({}))) as {
			confirm?: boolean;
		};
		if (body.confirm !== true)
			return localizedError(400, "migrate_unconfirmed");
		return tapWaitNdjson(
			userId,
			async () => {
				const result = await runMigrate(userId);
				if ("error" in result) {
					const { preview, ...err } = result;
					return { ...(await localizedErrorBody(err)), preview };
				}
				return result;
			},
			"migrate_failed",
		);
	});
}
