import { isPublicAssetKey } from "@/lib/assets";
import { ensureAssetVersions, listPublicAssets } from "@/server/assets";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { publicObjectUrl, r2Config } from "@/server/r2";
import { clientIp, rateLimitBy } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The listing is memoised for 5 min per instance; let the CDN share it too */
const LIST_CACHE =
	"public, max-age=60, s-maxage=300, stale-while-revalidate=3600";
/** `?key=` maps to the file's current public URL, whose `?v=` follows its content */
const REDIRECT_CACHE = "public, max-age=300, s-maxage=600";

export async function GET(request: Request) {
	const limited = rateLimitBy(`assets:${clientIp(request.headers)}`, 60);
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const url = new URL(request.url);
	const base = r2Config().publicBase;
	const key = url.searchParams.get("key");
	if (key) {
		if (!base || !isPublicAssetKey(key)) {
			return codeError(400, "bad_key");
		}
		await ensureAssetVersions();
		return new Response(null, {
			status: 302,
			headers: {
				Location: publicObjectUrl(key) ?? `${base}/${key}`,
				"Cache-Control": REDIRECT_CACHE,
			},
		});
	}
	if (!base) {
		return codeError(503, "unavailable");
	}
	try {
		const files = await listPublicAssets();
		return Response.json(
			{ base, files },
			{ headers: { "Cache-Control": LIST_CACHE } },
		);
	} catch {
		return codeError(503, "unavailable");
	}
}
