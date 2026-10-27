import { authed } from "@/server/authed";
import { localizedError, localizedErrorBody } from "@/server/i18n-http";
import { asSlot, connectMigrateToken } from "@/server/migrate";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { tapWaitNdjson } from "@/server/tap-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(
	request: Request,
	ctx: { params: Promise<{ slot: string }> },
) {
	const slot = asSlot((await ctx.params).slot);
	if (!slot) return new Response("not found", { status: 404 });
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");

		const body = (await request.json().catch(() => ({}))) as {
			token?: string;
			server?: string;
		};
		return tapWaitNdjson(
			userId,
			async () => {
				const result = await connectMigrateToken(
					userId,
					slot,
					body.token,
					body.server,
				);
				if ("error" in result) return localizedErrorBody(result);
				return result;
			},
			"migrate_failed",
		);
	});
}
