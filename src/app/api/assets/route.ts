import { isPublicAssetKey, publicAssetUrl } from "@/lib/assets";
import { listPublicAssets } from "@/server/assets";
import { r2Config } from "@/server/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The listing is memoised for 5 min per instance; let the CDN share it too */
const LIST_CACHE =
	"public, max-age=60, s-maxage=300, stale-while-revalidate=3600";
/** `?key=` maps to a fixed public URL */
const REDIRECT_CACHE = "public, max-age=3600, s-maxage=86400";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const base = r2Config().publicBase;
	const key = url.searchParams.get("key");
	if (key) {
		if (!base || !isPublicAssetKey(key)) {
			return Response.json({ error: "bad_key" }, { status: 400 });
		}
		return new Response(null, {
			status: 302,
			headers: {
				Location: publicAssetUrl(base, key),
				"Cache-Control": REDIRECT_CACHE,
			},
		});
	}
	if (!base) {
		return Response.json({ error: "unavailable" }, { status: 503 });
	}
	try {
		const files = await listPublicAssets();
		return Response.json(
			{ base, files },
			{ headers: { "Cache-Control": LIST_CACHE } },
		);
	} catch {
		return Response.json({ error: "unavailable" }, { status: 503 });
	}
}
