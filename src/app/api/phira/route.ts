import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { buildPhira } from "@/server/phira";
import { clientIp, rateLimitBy } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const limited = rateLimitBy(`phira:${clientIp(request.headers)}`, 60);
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const url = new URL(request.url);
	const built = await buildPhira(
		url.searchParams.get("id") || "",
		url.searchParams.get("level") || "",
		url.searchParams.get("ver") || undefined,
	);
	if ("error" in built)
		return codeError(built.error === "bad_level" ? 400 : 404, built.error, {
			stable: true,
		});
	// Manifest ids are free text: a quote or backslash would end or escape the quoted name early
	const ascii = built.filename
		.replace(/[^\x20-\x7E]/g, "_")
		.replace(/["\\]/g, "");
	const headers: Record<string, string> = {
		"Content-Type": "application/octet-stream",
		"Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(built.filename)}`,
		"Cache-Control": "private, no-store",
	};
	if (built.length) headers["Content-Length"] = String(built.length);
	// Piped straight from R2: a buffered body would hit the 4.5 MB function response limit
	return new Response(built.body, { headers });
}
