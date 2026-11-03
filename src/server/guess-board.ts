import {
	applyGuess,
	type BoardEntry,
	boardName,
	type GuessRun,
	rankBoard,
} from "@/lib/guess-board";
import { kvKey } from "@/phi/lib/const";
import { getDataHost } from "./data-host";
import { logger } from "./logger";

const KEEP_MS = 60 * 86_400_000;
const BOARD_MEMO_MS = 60_000;
/** KV lists can lag a write by up to 60 s; this instance's own writes cover the gap */
const RECENT_MS = 90_000;

const RUN = (day: string, user: string) => kvKey("guessRun", day, user);
const ENTRY = (day: string, user: string) => kvKey("guessEntry", day, user);
const ENTRIES = (day: string) => `${kvKey("guessEntry", day)}:`;

type EntryMeta = { n: string; t: number; ms: number; at: number };

const locks = new Map<string, Promise<unknown>>();
const boards = new Map<string, { at: number; entries: BoardEntry[] }>();
const recent = new Map<
	string,
	Map<string, { entry: BoardEntry | null; at: number }>
>();

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
	recent.clear();
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

function freshLocal(day: string, user: string) {
	const hit = recent.get(day)?.get(user);
	return hit && Date.now() - hit.at <= RECENT_MS ? hit : undefined;
}

function noteLocal(day: string, user: string, entry: BoardEntry | null) {
	const mine = recent.get(day) ?? new Map();
	mine.set(user, { entry, at: Date.now() });
	recent.set(day, mine);
}

function withLocal(day: string, listed: readonly BoardEntry[]): BoardEntry[] {
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

async function writeEntry(
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
		await host.db.set(ENTRY(day, user), JSON.stringify(meta), KEEP_MS, meta);
	} catch (err) {
		logger.warn(
			`guess board write: ${err instanceof Error ? err.message : err}`,
		);
		return false;
	}
	noteLocal(day, user, entryOf(user, meta) ?? null);
	return true;
}

async function dropEntry(day: string, user: string) {
	const host = await getDataHost();
	await host.db.del(ENTRY(day, user));
	noteLocal(day, user, null);
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
}): Promise<{ run: GuessRun; correct: boolean; ranked: boolean } | undefined> {
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
		const ranked =
			next.correct && opts.rank
				? await writeEntry(opts.day, opts.user, opts.name, next.run, now)
				: false;
		return { ...next, ranked };
	});
}

export async function setRanked(
	day: string,
	user: string,
	name: string,
	on: boolean,
): Promise<boolean> {
	if (!on) {
		await dropEntry(day, user);
		return false;
	}
	const run = await peekRun(day, user);
	if (run?.status !== "won") return false;
	return writeEntry(day, user, name, run, Date.now());
}

async function listed(day: string, fresh: boolean): Promise<BoardEntry[]> {
	const hot = boards.get(day);
	if (!fresh && hot && Date.now() - hot.at < BOARD_MEMO_MS) return hot.entries;
	const host = await getDataHost();
	const prefix = ENTRIES(day);
	const entries = (await host.db.list(prefix)).flatMap(({ key, meta }) => {
		const entry = entryOf(key.slice(prefix.length), meta);
		return entry ? [entry] : [];
	});
	boards.set(day, { at: Date.now(), entries });
	return entries;
}

async function ownEntry(day: string, user: string) {
	const local = freshLocal(day, user);
	if (local) return local.entry;
	const host = await getDataHost();
	const raw = await host.db.get(ENTRY(day, user));
	if (!raw) return null;
	try {
		return entryOf(user, JSON.parse(raw)) ?? null;
	} catch {
		return null;
	}
}

export async function isRanked(day: string, user: string): Promise<boolean> {
	return (await ownEntry(day, user)) !== null;
}

export async function boardFor(day: string, viewer?: string, fresh = false) {
	const entries = withLocal(day, await listed(day, fresh));
	if (viewer && fresh) {
		const own = await ownEntry(day, viewer);
		const rest = entries.filter((e) => e.user !== viewer);
		return rankBoard(own ? [...rest, own] : rest, viewer);
	}
	return rankBoard(entries, viewer);
}
