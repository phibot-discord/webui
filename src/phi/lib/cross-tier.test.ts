import assert from "node:assert/strict";
import test from "node:test";
import {
	CROSS_TIER_MAX_ACC,
	CROSS_TIER_MIN_ACC,
	crossGapText,
	crossTier,
} from "./cross-tier";

type Rec = { id: string; rank: string; acc: number; difficulty: number };

const best = (n = 27): Rec[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `best${i}`,
		rank: "AT",
		acc: 99.5,
		difficulty: 17,
	}));

const picked = (ranked: Rec[], line: number) =>
	crossTier(ranked, line).map(({ record }) => `${record.id} ${record.rank}`);

test("the accuracy bounds are 70% and 99.8%", () => {
	assert.equal(CROSS_TIER_MIN_ACC, 70);
	assert.equal(CROSS_TIER_MAX_ACC, 99.8);
});

test("charts above the line come hardest first, then the lower accuracy first", () => {
	const ranked = [
		...best(),
		{ id: "a", rank: "IN", acc: 99, difficulty: 16.8 },
		{ id: "b", rank: "AT", acc: 95.9, difficulty: 16.9 },
		{ id: "c", rank: "IN", acc: 98.9, difficulty: 16.9 },
		{ id: "d", rank: "AT", acc: 99.3, difficulty: 16.9 },
	];
	assert.deepEqual(picked(ranked, 16.7073), ["b AT", "c IN", "d AT", "a IN"]);
	const gaps = crossTier(ranked, 16.7073).map(({ gap }) => crossGapText(gap));
	assert.deepEqual(gaps, ["+0.19", "+0.19", "+0.19", "+0.09"]);
});

test("the B27 is left out even when it sits above the line", () => {
	assert.deepEqual(picked(best(), 16), []);
	const ranked = [...best(), { id: "x", rank: "IN", acc: 97, difficulty: 17 }];
	assert.deepEqual(picked(ranked, 16), ["x IN"]);
});

test("a chart at or below the line is left out", () => {
	const ranked = [
		...best(),
		{ id: "at", rank: "IN", acc: 97, difficulty: 15 },
		{ id: "below", rank: "IN", acc: 97, difficulty: 14.9 },
		{ id: "above", rank: "IN", acc: 97, difficulty: 15.1 },
	];
	assert.deepEqual(picked(ranked, 15), ["above IN"]);
});

test("under 70% is left out and exactly 70% is kept", () => {
	const ranked = [
		...best(),
		{ id: "low", rank: "IN", acc: 69.99, difficulty: 16 },
		{ id: "floor", rank: "IN", acc: 70, difficulty: 16 },
	];
	assert.deepEqual(picked(ranked, 15), ["floor IN"]);
});

test("above 99.8% is left out and exactly 99.8% is kept", () => {
	const ranked = [
		...best(),
		{ id: "high", rank: "IN", acc: 99.85, difficulty: 16 },
		{ id: "edge", rank: "IN", acc: 99.8, difficulty: 16 },
		{ id: "over", rank: "IN", acc: 99.8001, difficulty: 16 },
		{ id: "ap", rank: "IN", acc: 100, difficulty: 16 },
	];
	assert.deepEqual(picked(ranked, 15), ["edge IN"]);
});

test("fewer than 27 records are all in the B27, so nothing qualifies", () => {
	const ranked = [
		...best(20),
		{ id: "x", rank: "IN", acc: 90, difficulty: 17.5 },
	];
	assert.deepEqual(picked(ranked, 10), []);
	assert.deepEqual(picked([], 0), []);
});

test("ties fall back to the id, then the level, the same way every time", () => {
	const tied = [
		{ id: "b", rank: "AT", acc: 95, difficulty: 16 },
		{ id: "a", rank: "AT", acc: 95, difficulty: 16 },
		{ id: "a", rank: "IN", acc: 95, difficulty: 16 },
		{ id: "a", rank: "EZ", acc: 95, difficulty: 16 },
	];
	const forward = picked([...best(), ...tied], 15);
	const backward = picked([...best(), ...[...tied].reverse()], 15);
	assert.deepEqual(forward, ["a EZ", "a IN", "a AT", "b AT"]);
	assert.deepEqual(backward, forward);
});

test("the input list is not reordered or changed", () => {
	const ranked = [
		...best(),
		{ id: "a", rank: "IN", acc: 99, difficulty: 16.8 },
		{ id: "b", rank: "AT", acc: 95.9, difficulty: 16.9 },
	];
	const before = structuredClone(ranked);
	crossTier(ranked, 16);
	assert.deepEqual(ranked, before);
});

test("the gap reads as a signed two-decimal number and never as +0.00", () => {
	assert.equal(crossGapText(16.9 - 16.7073), "+0.19");
	assert.equal(crossGapText(1.5), "+1.50");
	assert.equal(crossGapText(0.003), "+0.01");
});
