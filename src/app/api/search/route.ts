import { isLocale } from "@/i18n/config";
import { textQuery } from "@/lib/text-search";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { logger } from "@/server/logger";
import { clientIp, rateLimitBy } from "@/server/rate-limit";
import { searchTexts } from "@/server/text-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

export async function GET(request: Request) {
	const limited = rateLimitBy(`search:${clientIp(request.headers)}`, 60);
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const params = new URL(request.url).searchParams;
	const asked = textQuery(params.get("q"));
	if (asked.kind === "long") return codeError(400, "bad_request");
	const raw = params.get("locale");
	const locale = isLocale(raw) ? raw : "en";
	if (asked.kind !== "ok") {
		return Response.json(
			{ q: "", groups: [] },
			{ headers: { "Cache-Control": CACHE } },
		);
	}
	try {
		const answer = await searchTexts(asked.q, locale);
		return Response.json(answer, { headers: { "Cache-Control": CACHE } });
	} catch (err) {
		logger.warn(`text search: ${err instanceof Error ? err.message : err}`);
		return codeError(503, "unavailable");
	}
}
