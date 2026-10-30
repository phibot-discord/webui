import { clampStep, puzzleKind } from "@/lib/guess";
import { puzzleImage } from "@/server/guess";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const limited = rateLimit({ ip: `guess-img:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedError(429, "rate_limit");
	const params = new URL(request.url).searchParams;
	const puzzle = params.get("p") || "";
	const kind = puzzleKind(puzzle);
	if (!kind) return new Response(null, { status: 404 });
	const image = await puzzleImage(puzzle, clampStep(params.get("s")));
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
