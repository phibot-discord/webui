import assert from "node:assert/strict";
import test from "node:test";
import {
	effectiveScore,
	estimateScore,
	rankingScoreOf,
	roundAcc,
	validAcc,
	validScore,
} from "./manual-score";

test("a full combo pins the score to the accuracy", () => {
	assert.equal(estimateScore(100, true), 1_000_000);
	assert.equal(estimateScore(100, false), 1_000_000);
	assert.equal(estimateScore(99.87, true), 998_830);
});

test("without FC the combo term scales with accuracy", () => {
	assert.equal(estimateScore(99.87, false), Math.round(898_830 + 99_870));
	assert.ok(estimateScore(95, false) < estimateScore(95, true));
});

test("a typed score wins over the estimate", () => {
	assert.equal(effectiveScore({ acc: 98, score: 965_432 }), 965_432);
	assert.equal(effectiveScore({ acc: 98, fc: true }), estimateScore(98, true));
	assert.equal(effectiveScore({ acc: 100 }), 1_000_000);
});

test("ranking score is three best APs plus best 27 over 30", () => {
	const rows = [
		{ acc: 100, rks: 16 },
		{ acc: 100, rks: 15 },
		{ acc: 99, rks: 14.5 },
		{ acc: 100, rks: 14 },
		{ acc: 100, rks: 13 },
	];
	// phi: 16 + 15 + 14 = 45; best 27 (all 5): 72.5
	assert.equal(rankingScoreOf(rows), (45 + 72.5) / 30);
	assert.equal(rankingScoreOf([]), 0);
});

test("accuracy keeps the typed digits (up to six) and validates ranges", () => {
	assert.equal(roundAcc(99.876), 99.876);
	assert.equal(roundAcc(99.89527229), 99.895272);
	assert.equal(validAcc(100), true);
	assert.equal(validAcc(100.01), false);
	assert.equal(validAcc(-1), false);
	assert.equal(validScore(1_000_000), true);
	assert.equal(validScore(1_000_001), false);
	assert.equal(validScore(12.5), false);
});
