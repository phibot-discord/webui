import { authed } from "@/server/authed";
import { privateJson } from "@/server/http";
import {
	codeError,
	localizedError,
	localizedRetryAfter,
} from "@/server/i18n-http";
import { rateLimitBy } from "@/server/rate-limit";
import { getCompareOptIn, setCompareOptIn } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) =>
		Response.json(
			{ on: await getCompareOptIn(userId) },
			{ headers: { "Cache-Control": "private, no-store" } },
		),
	);
}

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimitBy(`compare:${userId}`, 20);
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");
		const body = (await request.json().catch(() => ({}))) as { on?: unknown };
		if (typeof body.on !== "boolean") {
			return codeError(400, "bad_request");
		}
		const result = await setCompareOptIn(userId, body.on);
		if (result === "no_share") {
			return localizedError(409, "share_not_found");
		}
		return privateJson({ on: body.on });
	});
}
