import assert from "node:assert/strict";
import test from "node:test";
import { loopBand, loopOf, withEnd, withStart } from "./loop";

test("a loop is ordered and clamped to the track", () => {
	assert.deepEqual(loopOf(30, 12, 100), [12, 30]);
	assert.deepEqual(loopOf(-5, 8, 100), [0, 8]);
	assert.deepEqual(loopOf(95, 130, 100), [95, 100]);
});

test("a range shorter than a second is not a loop", () => {
	assert.equal(loopOf(10, 10.5, 100), null);
	assert.equal(loopOf(1, 5, 0), null);
	assert.equal(loopOf(Number.NaN, 5, 100), null);
});

test("a new start keeps the end when it is still ahead", () => {
	assert.deepEqual(withStart([10, 20], 14, 10, 100), [14, 20]);
	assert.deepEqual(withStart([10, 20], 19.5, 10, 100), [19.5, 29.5]);
	assert.deepEqual(withStart(null, 95, 10, 100), [95, 100]);
});

test("a new end keeps the start when it is still behind", () => {
	assert.deepEqual(withEnd([10, 20], 16, 10, 100), [10, 16]);
	assert.deepEqual(withEnd([10, 20], 10.5, 10, 100), [0.5, 10.5]);
	assert.deepEqual(withEnd(null, 4, 10, 100), [0, 4]);
});

test("the band covers the same share of the strip as the loop of the track", () => {
	assert.equal(loopBand([25, 50], 100), "M25.00 0h25.00v10h-25.00z");
	assert.equal(loopBand([1, 2], 0), "");
});
