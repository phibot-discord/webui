import assert from "node:assert/strict";
import test from "node:test";
import {
	applyGuess,
	type BoardEntry,
	boardName,
	formatClock,
	type GuessRun,
	rankBoard,
} from "./guess-board";

const start: GuessRun = { t0: 1_000, guesses: [], status: "playing" };

test("a right guess stops the clock at the server's time", () => {
	const one = applyGuess(start, "a.0", "b.0", 5_000);
	assert.equal(one.correct, false);
	assert.equal(one.run.status, "playing");
	const two = applyGuess(one.run, "b.0", "b.0", 9_500);
	assert.equal(two.correct, true);
	assert.equal(two.run.status, "won");
	assert.equal(two.run.ms, 8_500);
	assert.deepEqual(two.run.guesses, ["a.0", "b.0"]);
});

test("the same wrong guess twice does not use a try", () => {
	const one = applyGuess(start, "a.0", "b.0", 2_000).run;
	const again = applyGuess(one, "a.0", "b.0", 3_000).run;
	assert.equal(again.guesses.length, 1);
});

test("six misses or giving up ends the run, and a finished run never changes", () => {
	let run = start;
	for (const id of ["1", "2", "3", "4", "5", "6"]) {
		run = applyGuess(run, id, "x", 2_000).run;
	}
	assert.equal(run.status, "lost");
	assert.equal(applyGuess(run, "x", "x", 3_000).correct, false);
	assert.equal(
		applyGuess(start, undefined, "x", 2_000, true).run.status,
		"lost",
	);
});

test("fewer tries beat a faster time; ties share a rank", () => {
	const e = (user: string, tries: number, ms: number, at = 0): BoardEntry => ({
		user,
		name: user,
		tries,
		ms,
		at,
	});
	const board = rankBoard(
		[
			e("slow1", 1, 90_000),
			e("fast3", 3, 5_000),
			e("fast1", 1, 20_000),
			e("tie", 3, 5_000, 1),
		],
		"tie",
	);
	assert.deepEqual(
		board.rows.map((r) => [r.name, r.rank]),
		[
			["fast1", 1],
			["slow1", 2],
			["fast3", 3],
			["tie", 3],
		],
	);
	assert.equal(board.mine?.rank, 3);
	assert.equal(board.mine?.me, true);
	assert.equal(rankBoard([e("a", 1, 1)], undefined, 0).rows.length, 0);
});

test("clock and names", () => {
	assert.equal(formatClock(0), "0:00.0");
	assert.equal(formatClock(83_456), "1:23.4");
	assert.equal(formatClock(3_723_000), "1:02:03.0");
	assert.equal(boardName("  "), "Player");
	assert.equal([...boardName("名".repeat(40))].length, 24);
});
