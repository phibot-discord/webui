import { sessionUser } from "@/auth";
import {
	clampStep,
	dayKey,
	GUESS_STEPS,
	type GuessGame,
	puzzleKind,
} from "@/lib/guess";
import { runStep } from "@/lib/guess-board";
import { answerFor, answerView, clueUrl, type GuessSong } from "./guess";
import { guessRun } from "./guess-board";
import { earAnswer, earClueUrl } from "./guess-ear";
import { codeError, localizedError, localizedRetryAfter } from "./i18n-http";
import { clientIp, rateLimit } from "./rate-limit";

export function answerOf(
	game: GuessGame,
	puzzle: string,
): Promise<GuessSong | undefined> {
	return game === "ear" ? earAnswer(puzzle) : answerFor(puzzle);
}

export function clueOf(game: GuessGame, puzzle: string, step: number): string {
	return game === "ear" ? earClueUrl(puzzle, step) : clueUrl(puzzle, step);
}

export async function postGuess(
	request: Request,
	game: GuessGame,
): Promise<Response> {
	const limited = rateLimit({ ip: `guess:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const body = (await request.json().catch(() => ({}))) as {
		p?: unknown;
		guess?: unknown;
		step?: unknown;
		giveUp?: unknown;
		skip?: unknown;
		rank?: unknown;
	};
	const puzzle = typeof body.p === "string" ? body.p : "";
	const kind = puzzleKind(puzzle);
	if (!kind) return codeError(400, "bad_request");
	const headers = { "Cache-Control": "no-store" };
	const day = kind === "daily" ? puzzle.slice(2) : "";
	const live = day !== "" && day === dayKey();
	const player = kind === "daily" ? await sessionUser() : null;
	const user = player?.id;
	if (live && !user) return localizedError(401, "unauthorized");
	const answer = await answerOf(game, puzzle);
	if (!answer) return codeError(503, "unavailable");
	const guess =
		typeof body.guess === "string" && body.guess
			? body.guess.slice(0, 200)
			: undefined;
	const giveUp = body.giveUp === true;
	const skip = game === "ear" && body.skip === true;
	const rank = live && body.rank !== false;

	if (user) {
		const done = await guessRun({
			day,
			user,
			name: player?.name ?? "",
			answer: answer.id,
			guess,
			giveUp,
			skip,
			rank,
			game,
		});
		if (done) {
			const over = done.run.status !== "playing";
			return Response.json(
				{
					correct: done.correct,
					run: done.run,
					ranked: done.ranked,
					clue: clueOf(game, puzzle, runStep(done.run)),
					...(over ? { answer: answerView(answer) } : {}),
				},
				{ headers },
			);
		}
		if (live) {
			return codeError(409, "not_started");
		}
	}

	const correct = !skip && guess === answer.id;
	const over = correct || giveUp || clampStep(body.step) >= GUESS_STEPS - 1;
	return Response.json(
		{ correct, ...(over ? { answer: answerView(answer) } : {}) },
		{ headers },
	);
}
