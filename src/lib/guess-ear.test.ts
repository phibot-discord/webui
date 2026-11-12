import assert from "node:assert/strict";
import test from "node:test";
import { earAnswerKey, earSeconds } from "./guess-ear";

test("a step maps to its clue length and stays in range", () => {
	assert.equal(earSeconds(0), 1);
	assert.equal(earSeconds(1), 2);
	assert.equal(earSeconds(5), 16);
	assert.equal(earSeconds(99), 16);
	assert.equal(earSeconds(-3), 1);
	assert.equal(earSeconds(Number.NaN), 1);
});

test("an ear puzzle's answer key differs from the puzzle id", () => {
	const puzzle = "p-abcdefghijkl";
	assert.notEqual(earAnswerKey(puzzle), puzzle);
	assert.notEqual(earAnswerKey(puzzle), earAnswerKey("p-abcdefghijkm"));
});
