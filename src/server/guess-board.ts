import type { GuessGame } from "@/lib/guess";
import {
	applyGuess,
	type BoardEntry,
	boardName,
	type GuessRun,
	rankBoard,
} from "@/lib/guess-board";
import { kvKey } from "@/phi/lib/const";
import { evictOldest } from "@/phi/lib/lru";
import { getDataHost } from "./data-host";
import { logger } from "./logger";

const KEEP_MS = 60 * 86_400_000;
const BOARD_MEMO_MS = 60_000;
export const BOARD_MEMO_MAX = 32;
/** KV lists can lag a write by up to 60 s; this instance's own writes cover the gap */
const RECENT_MS = 90_000;

const SPACE: Record<GuessGame, string[]> = { jacket: [], ear: ["ear"] };
const RUN = (game: GuessGame, day: string, user: string) =>
	kvKey("guessRun", ...SPACE[game], day, user);
const ENTRY = (game: GuessGame, day: string, user: string) =>
	kvKey("guessEntry", ...SPACE[game], day, user);
const ENTRIES = (game: GuessGame, day: string) =>
	`${kvKey("guessEntry", ...SPACE[game], day)}:`;

type EntryMeta = { n: string; t: number; ms: number; at: number };

type GameState = {
	locks: Map<string, Promise<unknown>>;
	boards: Map<string, { at: number; entries: BoardEntry[] }>;
	recent: Map<string, Map<string, { entry: BoardEntry | null; at: number }>>;
};

const games: Record<GuessGame, GameState> = {
	jacket: { locks: new Map(), boards: new Map(), recent: new Map() },
	ear: { locks: new Map(), boards: new Map(), recent: new Map() },
};

function locked<T>(
	game: GuessGame,
	key: string,
	fn: () => Promise<T>,
): Promise<T> {
	const { locks } = games[game];
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
	for (const state of Object.values(games)) {
		state.locks.clear();
		state.boards.clear();
		state.recent.clear();
	}
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

function entryOf(user: string, meta: unknown): BoardEntry | undefined {
	if (!user || !meta || typeof meta !== "object") return undefined;
	const m = meta as Partial<EntryMeta>;
	return typeof m.n === "string" &&
		Number.isFinite(m.t) &&
		Number.isFinite(m.ms) &&
		Number.isFinite(m.at)
		? {
				user,
				name: m.n,
				tries: m.t as number,
				ms: m.ms as number,
				at: m.at as number,
			}
		: undefined;
}

function freshLocal(game: GuessGame, day: string, user: string) {
	const hit = games[game].recent.get(day)?.get(user);
	return hit && Date.now() - hit.at <= RECENT_MS ? hit : undefined;
}

function noteLocal(
	game: GuessGame,
	day: string,
	user: string,
	entry: BoardEntry | null,
) {
	const { recent } = games[game];
	const mine = recent.get(day) ?? new Map();
	mine.set(user, { entry, at: Date.now() });
	recent.set(day, mine);
}

function withLocal(
	game: GuessGame,
	day: string,
	listed: readonly BoardEntry[],
): BoardEntry[] {
	const { recent } = games[game];
	const mine = recent.get(day);
	if (!mine) return [...listed];
	const out = new Map(listed.map((e) => [e.user, e] as const));
	const now = Date.now();
	for (const [user, hit] of mine) {
		if (now - hit.at > RECENT_MS) {
			mine.delete(user);
			continue;
		}
		if (hit.entry) out.set(user, hit.entry);
		else out.delete(user);
	}
	if (!mine.size) recent.delete(day);
	return [...out.values()];
}

export async function peekRun(
	day: string,
	user: string,
	game: GuessGame = "jacket",
) {
	const host = await getDataHost();
	return parseRun(await host.db.get(RUN(game, day, user)));
}

export function startRun(
	day: string,
	user: string,
	now = Date.now(),
	game: GuessGame = "jacket",
): Promise<GuessRun> {
	return locked(game, `${day}:${user}`, async () => {
		const host = await getDataHost();
		const had = parseRun(await host.db.get(RUN(game, day, user)));
		if (had) return had;
		const run: GuessRun = { t0: now, guesses: [], status: "playing" };
		await host.db.set(RUN(game, day, user), JSON.stringify(run), KEEP_MS);
		return run;
	});
}

async function writeEntry(
	game: GuessGame,
	day: string,
	user: string,
	name: string,
	run: GuessRun,
	now: number,
) {
	if (run.status !== "won" || run.ms == null) return false;
	const meta: EntryMeta = {
		n: boardName(name),
		t: run.guesses.length,
		ms: run.ms,
		at: now,
	};
	try {
		const host = await getDataHost();
		await host.db.set(
			ENTRY(game, day, user),
			JSON.stringify(meta),
			KEEP_MS,
			meta,
		);
	} catch (err) {
		logger.warn(
			`guess board write: ${err instanceof Error ? err.message : err}`,
		);
		return false;
	}
	noteLocal(game, day, user, entryOf(user, meta) ?? null);
	return true;
}

async function dropEntry(game: GuessGame, day: string, user: string) {
	const host = await getDataHost();
	await host.db.del(ENTRY(game, day, user));
	noteLocal(game, day, user, null);
}

export function guessRun(opts: {
	day: string;
	user: string;
	name: string;
	answer: string;
	guess?: string;
	giveUp?: boolean;
	skip?: boolean;
	rank: boolean;
	now?: number;
	game?: GuessGame;
}): Promise<{ run: GuessRun; correct: boolean; ranked: boolean } | undefined> {
	const game = opts.game ?? "jacket";
	return locked(game, `${opts.day}:${opts.user}`, async () => {
		const host = await getDataHost();
		const run = parseRun(await host.db.get(RUN(game, opts.day, opts.user)));
		if (!run) return undefined;
		const now = opts.now ?? Date.now();
		const next = applyGuess(
			run,
			opts.guess,
			opts.answer,
			now,
			opts.giveUp,
			opts.skip,
		);
		if (next.run !== run) {
			await host.db.set(
				RUN(game, opts.day, opts.user),
				JSON.stringify(next.run),
				KEEP_MS,
			);
		}
		const ranked =
			next.correct && opts.rank
				? await writeEntry(game, opts.day, opts.user, opts.name, next.run, now)
				: false;
		return { ...next, ranked };
	});
}

export async function setRanked(
	day: string,
	user: string,
	name: string,
	on: boolean,
	game: GuessGame = "jacket",
): Promise<boolean> {
	if (!on) {
		await dropEntry(game, day, user);
		return false;
	}
	const run = await peekRun(day, user, game);
	if (run?.status !== "won") return false;
	return writeEntry(game, day, user, name, run, Date.now());
}

async function listed(
	game: GuessGame,
	day: string,
	fresh: boolean,
): Promise<BoardEntry[]> {
	const { boards } = games[game];
	const hot = boards.get(day);
	if (!fresh && hot && Date.now() - hot.at < BOARD_MEMO_MS) return hot.entries;
	const host = await getDataHost();
	const prefix = ENTRIES(game, day);
	const entries = (await host.db.list(prefix)).flatMap(({ key, meta }) => {
		const entry = entryOf(key.slice(prefix.length), meta);
		return entry ? [entry] : [];
	});
	boards.delete(day);
	boards.set(day, { at: Date.now(), entries });
	evictOldest(boards, BOARD_MEMO_MAX);
	return entries;
}

async function ownEntry(game: GuessGame, day: string, user: string) {
	const local = freshLocal(game, day, user);
	if (local) return local.entry;
	const host = await getDataHost();
	const raw = await host.db.get(ENTRY(game, day, user));
	if (!raw) return null;
	try {
		return entryOf(user, JSON.parse(raw)) ?? null;
	} catch {
		return null;
	}
}

export async function isRanked(
	day: string,
	user: string,
	game: GuessGame = "jacket",
): Promise<boolean> {
	return (await ownEntry(game, day, user)) !== null;
}

export async function boardFor(
	day: string,
	viewer?: string,
	fresh = false,
	game: GuessGame = "jacket",
) {
	const entries = withLocal(game, day, await listed(game, day, fresh));
	if (viewer && fresh) {
		const own = await ownEntry(game, day, viewer);
		const rest = entries.filter((e) => e.user !== viewer);
		return rankBoard(own ? [...rest, own] : rest, viewer);
	}
	return rankBoard(entries, viewer);
}
