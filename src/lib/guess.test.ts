import assert from "node:assert/strict";
import test from "node:test";
import {
	clampStep,
	dailyId,
	dayKey,
	GUESS_STEPS,
	practiceId,
	puzzleKind,
	shareText,
} from "./guess";

test("the day turns over at midnight in UTC+8", () => {
	assert.equal(dayKey(new Date("2026-10-31T15:59:00Z")), "2026-10-31");
	assert.equal(dayKey(new Date("2026-10-31T16:00:00Z")), "2026-11-01");
	assert.equal(dailyId("2026-10-31"), "d-2026-10-31");
});

test("future daily puzzles and junk ids are refused", () => {
	assert.equal(puzzleKind("d-2026-10-31", "2026-10-31"), "daily");
	assert.equal(puzzleKind("d-2026-10-30", "2026-10-31"), "daily");
	assert.equal(puzzleKind("d-2026-11-01", "2026-10-31"), undefined);
	assert.equal(puzzleKind("d-2026-13-45", "2026-12-31"), undefined);
	assert.equal(puzzleKind("p-abcdefghijkl", "2026-10-31"), "practice");
	assert.equal(puzzleKind("p-short", "2026-10-31"), undefined);
	assert.equal(puzzleKind("../etc", "2026-10-31"), undefined);
});

test("practice ids are url-safe", () => {
	const id = practiceId((n) => new Uint8Array(n).map((_, i) => i * 37));
	assert.match(id, /^p-[A-Za-z0-9_-]{12}$/);
	assert.equal(puzzleKind(id), "practice");
});

test("steps stay in range", () => {
	assert.equal(clampStep(-3), 0);
	assert.equal(clampStep("2"), 2);
	assert.equal(clampStep(99), GUESS_STEPS - 1);
	assert.equal(clampStep("x"), 0);
});

test("share text shows misses then the hit", () => {
	assert.equal(
		shareText({
			label: "PhiBot Guess 2026-10-31",
			tries: 3,
			won: true,
			url: "phibot.dev/guess",
		}),
		"PhiBot Guess 2026-10-31 · 3/6\n× × ●\nphibot.dev/guess",
	);
	assert.equal(
		shareText({ label: "x", tries: 6, won: false, url: "u" }),
		"x · X/6\n× × × × × ×\nu",
	);
	assert.equal(
		shareText({ label: "x", tries: 2, won: false, url: "u" }),
		"x · X/6\n× ×\nu",
		"giving up early shows only the guesses made",
	);
	assert.equal(
		shareText({ label: "x", tries: 0, won: false, url: "u" }),
		"x · X/6\n—\nu",
	);
});
