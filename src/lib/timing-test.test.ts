import assert from "node:assert/strict";
import test from "node:test";
import {
	beatTimes,
	countAtMost,
	steadiness,
	tapErrors,
	tapSpeed,
} from "./timing-test";

const near = (got: (number | null)[], want: (number | null)[]) => {
	assert.equal(got.length, want.length);
	got.forEach((value, i) => {
		const expected = want[i];
		if (expected === null || expected === undefined) assert.equal(value, null);
		else {
			assert.notEqual(value, null);
			assert.ok(Math.abs((value ?? 0) - expected) < 1e-6, `${value} at ${i}`);
		}
	});
};

test("beats are evenly spaced from the start", () => {
	assert.deepEqual(beatTimes(1, 120, 4), [1, 1.5, 2, 2.5]);
});

test("each beat gets the error of its closest tap in milliseconds", () => {
	near(tapErrors([1, 1.5, 2], [1.02, 1.48, 2.1]), [20, -20, 100]);
});

test("a tap further than half a beat from every beat is ignored", () => {
	near(tapErrors([1, 2, 3], [3.7]), [null, null, null]);
	near(tapErrors([1, 2, 3], [3.7, 1.4]), [400, null, null]);
});

test("two taps near one beat keep the closer one", () => {
	near(tapErrors([1, 2], [0.95, 1.2]), [-50, null]);
});

test("steadiness reports the lean, the spread around it and the misses", () => {
	const got = steadiness([10, 30, null, 20]);
	assert.equal(got.taps, 3);
	assert.equal(got.missed, 1);
	assert.equal(got.mean, 20);
	assert.ok(Math.abs(got.spread - 8.165) < 0.001, String(got.spread));
});

test("windows are measured from the player's own average", () => {
	const got = steadiness([100, 110, 90]);
	assert.equal(got.mean, 100);
	assert.equal(got.within[0], 3);
	assert.deepEqual(got.within, [3, 3, 3]);
});

test("no taps give zeros", () => {
	const got = steadiness([null, null]);
	assert.equal(got.taps, 0);
	assert.equal(got.missed, 2);
	assert.equal(got.mean, 0);
	assert.equal(got.spread, 0);
	assert.deepEqual(got.within, [0, 0, 0]);
});

test("speed is taps over the run and the best second is the busiest second", () => {
	const got = tapSpeed([0, 0.1, 0.2, 0.3, 5, 9.9], 10);
	assert.ok(Math.abs(got.perSecond - 0.6) < 1e-9, String(got.perSecond));
	assert.equal(got.bestSecond, 4);
});

test("an empty run has no speed", () => {
	assert.deepEqual(tapSpeed([], 10), { perSecond: 0, bestSecond: 0 });
	assert.deepEqual(tapSpeed([1, 2], 0), { perSecond: 0, bestSecond: 0 });
});

test("counting values at or below a number works on the edges", () => {
	assert.equal(countAtMost([1, 2, 2, 5], 2), 3);
	assert.equal(countAtMost([1, 2, 2, 5], 0), 0);
	assert.equal(countAtMost([1, 2, 2, 5], 9), 4);
	assert.equal(countAtMost([], 3), 0);
});
