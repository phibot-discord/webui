import assert from "node:assert/strict";
import test from "node:test";
import {
	type ChallengeRecord,
	challengeColor,
	challengePicks,
} from "./challenge-picks";

const rec = (
	id: string,
	rank: string,
	difficulty: number,
	acc: number,
): ChallengeRecord => ({ id, rank, difficulty, acc });

const keysOf = (charts: { id: string; rank: string }[]) =>
	charts.map((c) => `${c.id}:${c.rank}`);

test("the colour follows the total", () => {
	assert.equal(challengeColor(2_459_999), 0);
	assert.equal(challengeColor(2_460_000), 1);
	assert.equal(challengeColor(2_700_000), 2);
	assert.equal(challengeColor(2_850_000), 3);
	assert.equal(challengeColor(2_940_000), 4);
	assert.equal(challengeColor(2_999_999), 4);
	assert.equal(challengeColor(3_000_000), 5);
});

test("a level is the whole-number part of the constant", () => {
	const got = challengePicks([
		rec("A.0", "IN", 15.9, 98),
		rec("B.0", "IN", 15.0, 97),
		rec("C.0", "AT", 16.1, 96),
	]);
	assert.equal(got.length, 1);
	assert.equal(got[0]?.sum, 46);
	assert.deepEqual(
		got[0]?.charts.map((c) => c.level),
		[16, 15, 15],
	);
});

test("the best triple of a total wins", () => {
	const got = challengePicks([
		rec("D.0", "IN", 15.2, 90),
		rec("A.0", "IN", 15.2, 99),
		rec("C.0", "IN", 15.2, 97),
		rec("B.0", "IN", 15.2, 98),
	]);
	const pick = got.find((p) => p.sum === 45);
	assert.ok(pick);
	assert.deepEqual(keysOf(pick.charts), ["A.0:IN", "B.0:IN", "C.0:IN"]);
	assert.equal(pick.total, 2_940_000);
	assert.equal(pick.color, 4);
});

test("two difficulties of one song can share a triple", () => {
	const got = challengePicks([
		rec("A.0", "IN", 15.3, 98),
		rec("A.0", "AT", 15.8, 97),
		rec("B.0", "IN", 15.1, 96),
	]);
	assert.equal(got.length, 1);
	assert.equal(got[0]?.sum, 45);
	assert.deepEqual(keysOf(got[0]?.charts ?? []).sort(), [
		"A.0:AT",
		"A.0:IN",
		"B.0:IN",
	]);
});

test("a triple is three different charts", () => {
	assert.deepEqual(
		challengePicks([rec("A.0", "IN", 15.3, 98), rec("B.0", "AT", 16.2, 97)]),
		[],
	);
});

test("only the three best charts of a level matter", () => {
	const records = [
		rec("Z.0", "IN", 15.4, 90),
		rec("B.0", "IN", 15.4, 98),
		rec("E.0", "IN", 15.4, 99),
		rec("B.0", "AT", 15.9, 98),
		rec("A.0", "HD", 15.0, 98),
	];
	const forward = challengePicks(records);
	const backward = challengePicks([...records].reverse());
	assert.equal(forward.length, 1);
	assert.deepEqual(keysOf(forward[0]?.charts ?? []), [
		"E.0:IN",
		"A.0:HD",
		"B.0:AT",
	]);
	assert.deepEqual(backward, forward);
});

test("different level totals each get their best triple, highest total first", () => {
	const got = challengePicks([
		rec("A.0", "AT", 16.5, 97),
		rec("B.0", "IN", 15.5, 98),
		rec("C.0", "IN", 15.2, 99),
		rec("D.0", "IN", 14.8, 99.5),
	]);
	assert.deepEqual(
		got.map((p) => p.sum),
		[46, 45, 44],
	);
	assert.deepEqual(keysOf(got[1]?.charts ?? []), [
		"A.0:AT",
		"C.0:IN",
		"D.0:IN",
	]);
});

test("unplayed and constant-less records are ignored", () => {
	const got = challengePicks([
		rec("A.0", "IN", 15.3, 98),
		rec("B.0", "IN", 15.1, 97),
		rec("C.0", "IN", 15.6, 96),
		rec("X.0", "AT", 16.2, 0),
		rec("Y.0", "AT", 0, 99),
	]);
	const ids = got.flatMap((p) => p.charts.map((c) => c.id));
	assert.ok(!ids.includes("X.0"));
	assert.ok(!ids.includes("Y.0"));
	assert.deepEqual(
		got.map((p) => p.sum),
		[45],
	);
});

test("only the top rows are returned", () => {
	const records = [10, 11, 12, 13, 14, 15, 16].map((level) =>
		rec(`S${level}.0`, "IN", level + 0.4, 95),
	);
	const got = challengePicks(records, 3);
	assert.equal(got.length, 3);
	assert.deepEqual(
		got.map((p) => p.sum),
		[45, 44, 43],
	);
});
