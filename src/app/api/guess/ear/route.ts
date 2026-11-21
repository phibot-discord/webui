import { clampStep, dailyId, puzzleKind } from "@/lib/guess";
import { earClip, earClueTokenOk, earProbe } from "@/server/guess-ear";
import { postGuess } from "@/server/guess-game";
import { localizedRetryAfter } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sound(clip: Uint8Array | undefined, cache: string): Response {
	if (!clip) return new Response(null, { status: 503 });
	return new Response(new Uint8Array(clip), {
		headers: {
			"Content-Type": "audio/ogg",
			"Content-Disposition": 'inline; filename="clue.ogg"',
			"Cache-Control": cache,
			"X-Content-Type-Options": "nosniff",
		},
	});
}

export async function GET(request: Request) {
	const limited = rateLimit({ ip: `guess-ear:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const params = new URL(request.url).searchParams;
	if (params.get("probe") === "1") return sound(await earProbe(), "no-store");
	const puzzle = params.get("p") || "";
	if (!puzzleKind(puzzle)) return new Response(null, { status: 404 });
	const step = clampStep(params.get("s"));
	if (
		puzzle === dailyId() &&
		!earClueTokenOk(puzzle, step, params.get("k") ?? "")
	) {
		return new Response(null, {
			status: 403,
			headers: { "Cache-Control": "no-store" },
		});
	}
	return sound(await earClip(puzzle, step), "private, max-age=3600");
}

export async function POST(request: Request) {
	return postGuess(request, "ear");
}
