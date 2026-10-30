import assert from "node:assert/strict";
import test from "node:test";
import {
	bestOf,
	type CompareRecord,
	type CompareSide,
	compareSides,
	slugFromInput,
} from "./compare";

const rec = (
	id: string,
	rank: string,
	acc: number,
	score: number,
	fc = false,
	constant = 15,
): CompareRecord => [
	id,
	rank,
	acc,
	score,
	fc,
	constant,
	acc >= 70 ? constant * ((acc - 55) / 45) ** 2 : 0,
];

const side = (records: CompareRecord[]): CompareSide => ({
	name: "x",
	rks: 15,
	challenge: 0,
	records,
});

test("head to head counts wins on charts both played", () => {
	const a = side([
		rec("s1.0", "IN", 99, 990_000),
		rec("s2.0", "IN", 97, 960_000),
		rec("s3.0", "AT", 100, 1_000_000, true),
		rec("s4.0", "HD", 95, 940_000),
	]);
	const b = side([
		rec("s1.0", "IN", 98, 980_000),
		rec("s2.0", "IN", 98.5, 985_000),
		rec("s3.0", "AT", 100, 1_000_000, true),
		rec("s5.0", "EZ", 90, 900_000),
	]);
	const r = compareSides(a, b);
	assert.deepEqual(r.wins, { a: 1, b: 1, ties: 1 });
	assert.equal(r.onlyA, 1);
	assert.equal(r.onlyB, 1);
	assert.equal(r.both[0]?.id, "s2.0", "the biggest gap first");
	assert.equal(r.both[0]?.diff, -1.5);
});

test("tallies split clears, full combos and APs per level", () => {
	const r = compareSides(
		side([
			rec("a.0", "IN", 100, 1_000_000, true),
			rec("b.0", "IN", 99, 990_000, true),
			rec("c.0", "IN", 90, 880_000),
			rec("d.0", "IN", 60, 500_000),
		]),
		side([]),
	);
	const inA = r.tallies.find((t) => t.rank === "IN")?.a;
	assert.deepEqual(inA, { played: 4, clear: 3, fc: 2, ap: 1 });
});

test("best 30 are the highest chart RKS", () => {
	const many = Array.from({ length: 40 }, (_, i) =>
		rec(`s${i}.0`, "IN", 90 + i / 10, 900_000, false, 10 + i / 10),
	);
	const best = bestOf(many);
	assert.equal(best.length, 30);
	assert.equal(best[0]?.[0], "s39.0");
});

test("share links and bare slugs are both accepted", () => {
	assert.equal(
		slugFromInput("https://phibot.dev/p/abcDEF123_-x"),
		"abcDEF123_-x",
	);
	assert.equal(
		slugFromInput("https://phibot.dev/zh/p/abcDEF123456/b30"),
		"abcDEF123456",
	);
	assert.equal(slugFromInput("  abcDEF123456 "), "abcDEF123456");
	assert.equal(slugFromInput("not a slug"), undefined);
	assert.equal(slugFromInput(""), undefined);
});
