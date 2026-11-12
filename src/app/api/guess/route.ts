import { auth } from "@/auth";
import { clampStep, dayKey, GUESS_STEPS, puzzleKind } from "@/lib/guess";
import { runStep } from "@/lib/guess-board";
import { answerFor, answerView, clueUrl } from "@/server/guess";
import { guessRun } from "@/server/guess-board";
import {
	codeError,
	localizedError,
	localizedRetryAfter,
} from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const limited = rateLimit({ ip: `guess:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const body = (await request.json().catch(() => ({}))) as {
		p?: unknown;
		guess?: unknown;
		step?: unknown;
		giveUp?: unknown;
		rank?: unknown;
	};
	const puzzle = typeof body.p === "string" ? body.p : "";
	const kind = puzzleKind(puzzle);
	if (!kind) return codeError(400, "bad_request");
	const headers = { "Cache-Control": "no-store" };
	const day = kind === "daily" ? puzzle.slice(2) : "";
	const live = day !== "" && day === dayKey();
	const session = kind === "daily" ? await auth() : null;
	const user = session?.user?.id;
	if (live && !user) return localizedError(401, "unauthorized");
	const answer = await answerFor(puzzle);
	if (!answer) return codeError(503, "unavailable");
	const guess =
		typeof body.guess === "string" && body.guess
			? body.guess.slice(0, 200)
			: undefined;
	const giveUp = body.giveUp === true;
	const rank = live && body.rank !== false;

	if (user) {
		const done = await guessRun({
			day,
			user,
			name: session?.user?.name ?? "",
			answer: answer.id,
			guess,
			giveUp,
			rank,
		});
		if (done) {
			const over = done.run.status !== "playing";
			return Response.json(
				{
					correct: done.correct,
					run: done.run,
					ranked: done.ranked,
					clue: clueUrl(puzzle, runStep(done.run)),
					...(over ? { answer: answerView(answer) } : {}),
				},
				{ headers },
			);
		}
		if (live) {
			return codeError(409, "not_started");
		}
	}

	const correct = guess === answer.id;
	const over = correct || giveUp || clampStep(body.step) >= GUESS_STEPS - 1;
	return Response.json(
		{ correct, ...(over ? { answer: answerView(answer) } : {}) },
		{ headers },
	);
}
