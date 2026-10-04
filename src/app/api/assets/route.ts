import { isPublicAssetKey, publicAssetUrl } from "@/lib/assets";
import { listPublicAssets } from "@/server/assets";
import { r2Config } from "@/server/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const base = r2Config().publicBase;
	const key = url.searchParams.get("key");
	if (key) {
		if (!base || !isPublicAssetKey(key)) {
			return Response.json({ error: "bad_key" }, { status: 400 });
		}
		return Response.redirect(publicAssetUrl(base, key), 302);
	}
	if (!base) {
		return Response.json({ error: "unavailable" }, { status: 503 });
	}
	try {
		const files = await listPublicAssets();
		return Response.json(
			{ base, files },
			{ headers: { "Cache-Control": "public, max-age=60" } },
		);
	} catch {
		return Response.json({ error: "unavailable" }, { status: 503 });
	}
}
