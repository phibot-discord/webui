import {
	applyGuess,
	type BoardEntry,
	boardName,
	type GuessRun,
	rankBoard,
} from "@/lib/guess-board";
import { kvKey } from "@/phi/lib/const";
import { getDataHost } from "./data-host";

const KEEP_MS = 60 * 86_400_000;
const BOARD_MEMO_MS = 60_000;

const RUN = (day: string, user: string) => kvKey("guessRun", day, user);
const BOARD = (day: string) => kvKey("guessBoard", day);

const locks = new Map<string, Promise<unknown>>();
const boards = new Map<string, { at: number; entries: BoardEntry[] }>();

function locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
	const prev = locks.get(key) ?? Promise.resolve();
	const job = prev.catch(() => undefined).then(fn);
	const tail = job.catch(() => undefined);
	locks.set(key, tail);
	void tail.then(() => {
		if (locks.get(key) === tail) locks.delete(key);
	});
	return job;
}

export function resetGuessBoardForTest() {
	locks.clear();
	boards.clear();
}

function parseRun(raw: string | undefined): GuessRun | undefined {
	if (!raw) return undefined;
	try {
		const run = JSON.parse(raw) as GuessRun;
		return Number.isFinite(run.t0) && Array.isArray(run.guesses)
			? run
			: undefined;
	} catch {
		return undefined;
	}
}

function parseBoard(raw: string | undefined): BoardEntry[] {
	if (!raw) return [];
	try {
		const list = JSON.parse(raw) as unknown;
		return Array.isArray(list)
			? (list as BoardEntry[]).filter(
					(e) =>
						typeof e?.user === "string" &&
						Number.isFinite(e.tries) &&
						Number.isFinite(e.ms),
				)
			: [];
	} catch {
		return [];
	}
}

export async function peekRun(day: string, user: string) {
	const host = await getDataHost();
	return parseRun(await host.db.get(RUN(day, user)));
}

export function startRun(
	day: string,
	user: string,
	now = Date.now(),
): Promise<GuessRun> {
	return locked(`${day}:${user}`, async () => {
		const host = await getDataHost();
		const had = parseRun(await host.db.get(RUN(day, user)));
		if (had) return had;
		const run: GuessRun = { t0: now, guesses: [], status: "playing" };
		await host.db.set(RUN(day, user), JSON.stringify(run), KEEP_MS);
		return run;
	});
}

function updateBoard(
	day: string,
	change: (entries: BoardEntry[]) => BoardEntry[],
): Promise<BoardEntry[]> {
	return locked(`board:${day}`, async () => {
		const host = await getDataHost();
		const entries = change(parseBoard(await host.db.get(BOARD(day))));
		await host.db.set(BOARD(day), JSON.stringify(entries), KEEP_MS);
		boards.set(day, { at: Date.now(), entries });
		return entries;
	});
}

async function writeEntry(
	day: string,
	user: string,
	name: string,
	run: GuessRun,
	now: number,
) {
	if (run.status !== "won" || run.ms == null) return;
	const entry: BoardEntry = {
		user,
		name: boardName(name),
		tries: run.guesses.length,
		ms: run.ms,
		at: now,
	};
	await updateBoard(day, (entries) => [
		...entries.filter((e) => e.user !== user),
		entry,
	]);
}

export function guessRun(opts: {
	day: string;
	user: string;
	name: string;
	answer: string;
	guess?: string;
	giveUp?: boolean;
	rank: boolean;
	now?: number;
}): Promise<{ run: GuessRun; correct: boolean } | undefined> {
	return locked(`${opts.day}:${opts.user}`, async () => {
		const host = await getDataHost();
		const run = parseRun(await host.db.get(RUN(opts.day, opts.user)));
		if (!run) return undefined;
		const now = opts.now ?? Date.now();
		const next = applyGuess(run, opts.guess, opts.answer, now, opts.giveUp);
		if (next.run !== run) {
			await host.db.set(
				RUN(opts.day, opts.user),
				JSON.stringify(next.run),
				KEEP_MS,
			);
		}
		if (next.correct && opts.rank) {
			await writeEntry(opts.day, opts.user, opts.name, next.run, now);
		}
		return next;
	});
}

export async function setRanked(
	day: string,
	user: string,
	name: string,
	on: boolean,
): Promise<boolean> {
	if (!on) {
		await updateBoard(day, (entries) => entries.filter((e) => e.user !== user));
		return false;
	}
	const run = await peekRun(day, user);
	if (run?.status !== "won") return false;
	await writeEntry(day, user, name, run, Date.now());
	return true;
}

async function entriesFor(day: string, fresh = false): Promise<BoardEntry[]> {
	const hot = boards.get(day);
	if (!fresh && hot && Date.now() - hot.at < BOARD_MEMO_MS) return hot.entries;
	const host = await getDataHost();
	const entries = parseBoard(await host.db.get(BOARD(day)));
	boards.set(day, { at: Date.now(), entries });
	return entries;
}

export async function isRanked(day: string, user: string): Promise<boolean> {
	return (await entriesFor(day)).some((e) => e.user === user);
}

export async function boardFor(day: string, viewer?: string, fresh = false) {
	return rankBoard(await entriesFor(day, fresh), viewer);
}
