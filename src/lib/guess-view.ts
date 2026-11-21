import { dailyId, type GuessGame, puzzleKind } from "./guess";
import { EAR_PARAM } from "./guess-ear";

export const EAR_DAILY = "daily";

type Query = Record<string, string | string[] | undefined>;

export type GuessView =
	| { redirect: "p" | typeof EAR_PARAM }
	| {
			game: GuessGame;
			puzzle: string;
			daily: boolean;
			day: string;
			live: boolean;
	  };

function one(raw: string | string[] | undefined): string {
	return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
}

export function guessView(query: Query, today: string): GuessView {
	const asked = one(query.p);
	const ear = one(query[EAR_PARAM]);
	if (asked === "new") return { redirect: "p" };
	if (ear === "new") return { redirect: EAR_PARAM };
	const game: GuessGame = ear ? "ear" : "jacket";
	const wanted = ear || asked;
	const kind = wanted ? puzzleKind(wanted, today) : undefined;
	const puzzle = kind ? wanted : dailyId(today);
	const daily = kind !== "practice";
	const day = daily ? puzzle.slice(2) : "";
	return { game, puzzle, daily, day, live: daily && day === today };
}

export function guessHref(game: GuessGame, daily: boolean): string {
	if (game === "ear") return `/guess?${EAR_PARAM}=${daily ? EAR_DAILY : "new"}`;
	return daily ? "/guess" : "/guess?p=new";
}
