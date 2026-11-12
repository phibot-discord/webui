import assert from "node:assert/strict";
import test from "node:test";
import { statusAge } from "./status";

const MINUTE = 60_000;

test("data up to two and a half refresh periods old is fresh", () => {
	assert.equal(statusAge(0, 0, MINUTE), "fresh");
	assert.equal(statusAge(0, 2.5 * MINUTE - 1, MINUTE), "fresh");
});

test("older data is late, and stale from five periods on", () => {
	assert.equal(statusAge(0, 2.5 * MINUTE, MINUTE), "late");
	assert.equal(statusAge(0, 5 * MINUTE - 1, MINUTE), "late");
	assert.equal(statusAge(0, 5 * MINUTE, MINUTE), "stale");
});

test("a page without data is late, so the board asks again", () => {
	assert.equal(statusAge(null, 0, MINUTE), "late");
});
