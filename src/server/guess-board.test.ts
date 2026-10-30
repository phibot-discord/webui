import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
	boardFor,
	guessRun,
	isRanked,
	peekRun,
	resetGuessBoardForTest,
	setRanked,
	startRun,
} from "./guess-board";

const kv = new Map<string, string>();
const db = {
	get: async (key: string) => kv.get(key),
	set: async (key: string, value: string) => {
		await new Promise((r) => setTimeout(r, 1));
		kv.set(key, value);
	},
	del: async (key: string) => {
		kv.delete(key);
	},
	keys: async (prefix = "") =>
		[...kv.keys()].filter((k) => k.startsWith(prefix)),
};
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
});

beforeEach(() => {
	kv.clear();
	resetGuessBoardForTest();
});

const DAY = "2026-10-31";

test("starting twice keeps the first start time", async () => {
	const a = await startRun(DAY, "u1", 1_000);
	const b = await startRun(DAY, "u1", 9_000);
	assert.equal(a.t0, 1_000);
	assert.equal(b.t0, 1_000);
	assert.equal((await peekRun(DAY, "u1"))?.t0, 1_000);
});

test("guesses without a started run are not counted", async () => {
	assert.equal(
		await guessRun({
			day: DAY,
			user: "u0",
			name: "x",
			answer: "a",
			guess: "a",
			rank: true,
		}),
		undefined,
	);
});

test("parallel guesses each use a try", async () => {
	await startRun(DAY, "u2", 0);
	const ids = ["w1", "w2", "w3", "right"];
	const results = await Promise.all(
		ids.map((guess, i) =>
			guessRun({
				day: DAY,
				user: "u2",
				name: "P",
				answer: "right",
				guess,
				rank: true,
				now: 1_000 + i,
			}),
		),
	);
	assert.equal(results.at(-1)?.run.guesses.length, 4);
	const board = await boardFor(DAY, "u2");
	assert.equal(board.mine?.tries, 4);
});

test("a win ranks by tries, then time; unticking removes the entry", async () => {
	for (const [user, guesses, end] of [
		["slow", ["x", "a"], 60_000],
		["fast", ["x", "a"], 20_000],
		["first", ["a"], 90_000],
	] as const) {
		await startRun(DAY, user, 0);
		for (const guess of guesses) {
			await guessRun({
				day: DAY,
				user,
				name: user,
				answer: "a",
				guess,
				rank: true,
				now: end,
			});
		}
	}
	const board = await boardFor(DAY, "fast");
	assert.deepEqual(
		board.rows.map((r) => [r.name, r.rank, r.tries, r.ms]),
		[
			["first", 1, 1, 90_000],
			["fast", 2, 2, 20_000],
			["slow", 3, 2, 60_000],
		],
	);
	assert.equal(board.mine?.name, "fast");
	await setRanked(DAY, "fast", "fast", false);
	assert.equal(await isRanked(DAY, "fast"), false);
	assert.equal((await boardFor(DAY)).total, 2);
	assert.equal(await setRanked(DAY, "fast", "fast", true), true);
	assert.equal((await boardFor(DAY)).total, 3);
});

test("a win with ranking off stays off the board, and a loss can't be added", async () => {
	await startRun(DAY, "quiet", 0);
	await guessRun({
		day: DAY,
		user: "quiet",
		name: "q",
		answer: "a",
		guess: "a",
		rank: false,
		now: 5,
	});
	assert.equal(await isRanked(DAY, "quiet"), false);
	await startRun(DAY, "lost", 0);
	await guessRun({
		day: DAY,
		user: "lost",
		name: "l",
		answer: "a",
		giveUp: true,
		rank: true,
	});
	assert.equal(await setRanked(DAY, "lost", "l", true), false);
	assert.equal((await boardFor(DAY)).total, 0);
});

test("the whole day's board is one key, so reading it is one KV call", async () => {
	for (const user of ["a", "b", "c"]) {
		await startRun(DAY, user, 0);
		await guessRun({
			day: DAY,
			user,
			name: user,
			answer: "x",
			guess: "x",
			rank: true,
			now: 9,
		});
	}
	const boardKeys = [...kv.keys()].filter((k) => k.includes("guessBoard"));
	assert.deepEqual(boardKeys, [`phi:guessBoard:${DAY}`]);
	assert.equal((await boardFor(DAY)).total, 3);
});
