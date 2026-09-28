import { authed } from "@/server/authed";
import { bindWithToken } from "@/server/bind";
import { getDataHost } from "@/server/data-host";
import { localizedError, localizedErrorBody } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: Request) {
	return authed(async (userId) => {
		const host = await getDataHost();
		const limited = await rateLimit(host.store, {
			userId,
			ip: clientIp(request.headers),
		});
		if (!limited.ok) return localizedError(429, "rate_limit");

		const body = (await request.json().catch(() => ({}))) as {
			token?: string;
			server?: string;
			global?: boolean;
		};
		return tapWaitNdjson(
			userId,
			async () => {
				const result = await bindWithToken(
					userId,
					body.token,
					body.server,
					body.global,
				);
				if ("error" in result) return localizedErrorBody(result);
				return { status: "bound", ...result };
			},
			{ error: "bind_failed", code: "bind_failed", status: 502 },
		);
	});
}
