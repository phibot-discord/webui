import { clampStep, GUESS_STEPS, puzzleKind } from "@/lib/guess";
import { answerView } from "@/server/guess";
import { earAnswer, earClip } from "@/server/guess-ear";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const limited = rateLimit({ ip: `guess-ear:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const params = new URL(request.url).searchParams;
	const puzzle = params.get("p") || "";
	if (puzzleKind(puzzle) !== "practice")
		return new Response(null, { status: 404 });
	const clip = await earClip(puzzle, clampStep(params.get("s")));
	if (!clip) return new Response(null, { status: 503 });
	return new Response(new Uint8Array(clip), {
		headers: {
			"Content-Type": "audio/ogg",
			"Content-Disposition": 'inline; filename="clue.ogg"',
			"Cache-Control": "private, max-age=3600",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

export async function POST(request: Request) {
	const limited = rateLimit({ ip: `guess:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const body = (await request.json().catch(() => ({}))) as {
		p?: unknown;
		guess?: unknown;
		step?: unknown;
		giveUp?: unknown;
	};
	const puzzle = typeof body.p === "string" ? body.p : "";
	if (puzzleKind(puzzle) !== "practice") return codeError(400, "bad_request");
	const answer = await earAnswer(puzzle);
	if (!answer) return codeError(503, "unavailable");
	const guess =
		typeof body.guess === "string" && body.guess
			? body.guess.slice(0, 200)
			: undefined;
	const correct = guess === answer.id;
	const over =
		correct || body.giveUp === true || clampStep(body.step) >= GUESS_STEPS - 1;
	return Response.json(
		{ correct, ...(over ? { answer: answerView(answer) } : {}) },
		{ headers: { "Cache-Control": "no-store" } },
	);
}
