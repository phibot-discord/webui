import { songHistory } from "@/server/history";
import { localizedRetryAfter } from "@/server/i18n-http";
import { phiraExtras } from "@/server/phira";
import { clientIp, rateLimitBy } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const limited = rateLimitBy(`phira-extras:${clientIp(request.headers)}`, 60);
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const id = new URL(request.url).searchParams.get("id") || "";
	const [levels, history] = await Promise.all([
		phiraExtras(id),
		songHistory(id).catch(() => undefined),
	]);
	return Response.json(
		{
			levels,
			...(history
				? { history: { current: history.current, eras: history.eras } }
				: {}),
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
