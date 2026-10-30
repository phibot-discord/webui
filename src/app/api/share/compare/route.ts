import { authed } from "@/server/authed";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";
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
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");
		const body = (await request.json().catch(() => ({}))) as { on?: unknown };
		if (typeof body.on !== "boolean") {
			return Response.json({ error: "bad_request" }, { status: 400 });
		}
		const result = await setCompareOptIn(userId, body.on);
		if (result === "no_share") {
			return localizedError(409, "share_not_found");
		}
		return Response.json({ on: body.on });
	});
}
