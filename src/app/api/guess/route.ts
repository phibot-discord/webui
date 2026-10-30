import { auth } from "@/auth";
import { clampStep, GUESS_STEPS, puzzleKind } from "@/lib/guess";
import { answerFor, answerView } from "@/server/guess";
import { guessRun } from "@/server/guess-board";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const limited = rateLimit({ ip: `guess:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedError(429, "rate_limit");
	const body = (await request.json().catch(() => ({}))) as {
		p?: unknown;
		guess?: unknown;
		step?: unknown;
		giveUp?: unknown;
		rank?: unknown;
	};
	const puzzle = typeof body.p === "string" ? body.p : "";
	const kind = puzzleKind(puzzle);
	if (!kind) return Response.json({ error: "bad_request" }, { status: 400 });
	const answer = await answerFor(puzzle);
	if (!answer) return Response.json({ error: "unavailable" }, { status: 503 });
	const guess =
		typeof body.guess === "string" && body.guess
			? body.guess.slice(0, 200)
			: undefined;
	const giveUp = body.giveUp === true;
	const headers = { "Cache-Control": "no-store" };

	if (kind === "daily") {
		const session = await auth();
		const user = session?.user?.id;
		if (user) {
			const done = await guessRun({
				day: puzzle.slice(2),
				user,
				name: session.user?.name ?? "",
				answer: answer.id,
				guess,
				giveUp,
				rank: body.rank !== false,
			});
			if (!done) {
				return Response.json(
					{ error: "not_started" },
					{ status: 409, headers },
				);
			}
			const over = done.run.status !== "playing";
			return Response.json(
				{
					correct: done.correct,
					run: done.run,
					ranked: done.correct && body.rank !== false,
					...(over ? { answer: answerView(answer) } : {}),
				},
				{ headers },
			);
		}
	}

	const correct = guess === answer.id;
	const over = correct || giveUp || clampStep(body.step) >= GUESS_STEPS - 1;
	return Response.json(
		{ correct, ...(over ? { answer: answerView(answer) } : {}) },
		{ headers },
	);
}
