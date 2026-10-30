import assert from "node:assert/strict";
import test from "node:test";
import {
	defaultRange,
	inRange,
	nearestIndex,
	niceStep,
	signedDelta,
	timeTicks,
	valueTicks,
} from "./trend-chart";

const DAY = 86_400_000;

test("a range keeps the reading just before it, so the line starts at the edge", () => {
	const pts: [number, number][] = [
		[0, 10],
		[100 * DAY, 11],
		[200 * DAY, 12],
		[210 * DAY, 13],
	];
	const m1 = inRange(pts, "m1");
	assert.deepEqual(
		m1.map(([t]) => t / DAY),
		[100, 200, 210],
	);
	assert.equal(inRange(pts, "all").length, 4);
	assert.deepEqual(inRange([], "m1"), []);
});

test("long histories open on the last year", () => {
	assert.equal(defaultRange([[0, 1]]), "all");
	assert.equal(
		defaultRange([
			[0, 1],
			[400 * DAY, 2],
		]),
		"y1",
	);
	assert.equal(
		defaultRange([
			[0, 1],
			[20 * DAY, 2],
		]),
		"all",
	);
});

test("value ticks cover the data on round steps", () => {
	const { min, max, ticks } = valueTicks(15.12, 16.71);
	assert.ok(min <= 15.12 && max >= 16.71);
	assert.ok(ticks.length >= 3 && ticks.length <= 8);
	assert.equal(niceStep(1, 4), 0.5);
	assert.equal(niceStep(0.03, 4), 0.01);
	const flat = valueTicks(16.7, 16.7);
	assert.ok(flat.max > flat.min);
});

test("time ticks are evenly spaced", () => {
	assert.deepEqual(timeTicks(0, 100, 4), [0, 25, 50, 75, 100]);
	assert.deepEqual(timeTicks(5, 5), [5]);
});

test("nearest index snaps to the closest reading", () => {
	const xs = [0, 10, 20, 30];
	assert.equal(nearestIndex(xs, -5), 0);
	assert.equal(nearestIndex(xs, 14), 1);
	assert.equal(nearestIndex(xs, 16), 2);
	assert.equal(nearestIndex(xs, 99), 3);
	assert.equal(nearestIndex([], 1), -1);
});

test("signed deltas use a real minus sign", () => {
	assert.equal(signedDelta(0.01234), "+0.0123");
	assert.equal(signedDelta(-0.5), "−0.5000");
	assert.equal(signedDelta(0.00001), "0.0000");
});
