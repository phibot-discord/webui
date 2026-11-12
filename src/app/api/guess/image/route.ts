import { clampStep, dailyId, puzzleKind } from "@/lib/guess";
import { clueTokenOk, puzzleImage } from "@/server/guess";
import { localizedRetryAfter } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const limited = rateLimit({ ip: `guess-img:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const params = new URL(request.url).searchParams;
	const puzzle = params.get("p") || "";
	const kind = puzzleKind(puzzle);
	if (!kind) return new Response(null, { status: 404 });
	const step = clampStep(params.get("s"));
	if (
		puzzle === dailyId() &&
		!clueTokenOk(puzzle, step, params.get("k") ?? "")
	) {
		return new Response(null, {
			status: 403,
			headers: { "Cache-Control": "no-store" },
		});
	}
	const image = await puzzleImage(puzzle, step);
	if (!image) return new Response(null, { status: 503 });
	return new Response(new Uint8Array(image), {
		headers: {
			"Content-Type": "image/jpeg",
			"Content-Disposition": 'inline; filename="clue.jpg"',
			"Cache-Control":
				kind === "daily"
					? "public, max-age=3600, s-maxage=86400"
					: "public, max-age=86400, s-maxage=604800",
		},
	});
}
