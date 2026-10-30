import { GUESS_STEPS } from "./guess";

export type RunStatus = "playing" | "won" | "lost";

export type GuessRun = {
	t0: number;
	guesses: string[];
	status: RunStatus;
	ms?: number;
};

export type BoardEntry = {
	user: string;
	name: string;
	tries: number;
	ms: number;
	at: number;
};

export type BoardRow = {
	rank: number;
	name: string;
	tries: number;
	ms: number;
	me: boolean;
};

export function applyGuess(
	run: GuessRun,
	guess: string | undefined,
	answer: string,
	now: number,
	giveUp = false,
): { run: GuessRun; correct: boolean } {
	if (run.status !== "playing") return { run, correct: false };
	const guesses =
		guess && !run.guesses.includes(guess)
			? [...run.guesses, guess]
			: run.guesses;
	const correct = Boolean(guess) && guess === answer;
	const status: RunStatus = correct
		? "won"
		: giveUp || guesses.length >= GUESS_STEPS
			? "lost"
			: "playing";
	return {
		run: {
			...run,
			guesses,
			status,
			...(status === "won" ? { ms: Math.max(0, now - run.t0) } : {}),
		},
		correct,
	};
}

export function compareEntries(a: BoardEntry, b: BoardEntry): number {
	return (
		a.tries - b.tries ||
		a.ms - b.ms ||
		a.at - b.at ||
		(a.user < b.user ? -1 : 1)
	);
}

export function rankBoard(
	entries: readonly BoardEntry[],
	viewer?: string,
	limit = 50,
): { rows: BoardRow[]; total: number; mine?: BoardRow } {
	const sorted = [...entries].sort(compareEntries);
	const rows: BoardRow[] = [];
	let mine: BoardRow | undefined;
	let rank = 0;
	sorted.forEach((e, i) => {
		const prev = sorted[i - 1];
		if (!prev || prev.tries !== e.tries || prev.ms !== e.ms) rank = i + 1;
		const row = {
			rank,
			name: e.name,
			tries: e.tries,
			ms: e.ms,
			me: e.user === viewer,
		};
		if (row.me) mine = row;
		if (i < limit) rows.push(row);
	});
	return { rows, total: sorted.length, ...(mine ? { mine } : {}) };
}

export function formatClock(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 100));
	const tenths = total % 10;
	const s = Math.floor(total / 10);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const mm = h ? String(m).padStart(2, "0") : String(m);
	return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}.${tenths}`;
}

export function boardName(raw: string | null | undefined): string {
	const chars = [
		...String(raw ?? "")
			.replace(/\s+/g, " ")
			.trim(),
	];
	if (!chars.length) return "Player";
	return chars.length > 24 ? `${chars.slice(0, 23).join("")}…` : chars.join("");
}
