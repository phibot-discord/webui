import assert from "node:assert/strict";
import test from "node:test";
import {
	areaPath,
	linePath,
	nearestIndex,
	niceMax,
	rollup,
	uptimeBand,
	uptimeHeight,
} from "./status-chart";

test("niceMax rounds up to 1, 2, 2.5 or 5 of a power of ten", () => {
	assert.equal(niceMax(0), 1);
	assert.equal(niceMax(87), 100);
	assert.equal(niceMax(130), 200);
	assert.equal(niceMax(212), 250);
	assert.equal(niceMax(0.4), 0.5);
});

test("uptime bands and bar heights", () => {
	assert.equal(uptimeBand(null), "none");
	assert.equal(uptimeBand(100), "good");
	assert.equal(uptimeBand(99.5), "good");
	assert.equal(uptimeBand(98), "warn");
	assert.equal(uptimeBand(80), "bad");
	assert.equal(uptimeHeight(null), 0);
	assert.equal(uptimeHeight(100), 1);
	assert.equal(uptimeHeight(50), 0.2);
	assert.equal(uptimeHeight(97.5), 0.6);
});

test("paths break at gaps", () => {
	const x = (i: number) => i * 10;
	const y = (v: number) => 100 - v;
	assert.equal(
		linePath([1, 2, null, 4], x, y),
		"M0.0 99.0L10.0 98.0M30.0 96.0",
	);
	assert.equal(
		areaPath([1, null, 3], x, y, 100),
		"M0.0 100L0.0 99.0L0.0 100ZM20.0 100L20.0 97.0L20.0 100Z",
	);
});

test("nearestIndex snaps to the closest point", () => {
	assert.equal(nearestIndex(0, 10, 5, 4), 0);
	assert.equal(nearestIndex(22, 10, 5, 4), 2);
	assert.equal(nearestIndex(500, 10, 5, 4), 3);
	assert.equal(nearestIndex(5, 10, 5, 1), 0);
});

test("rollup averages each key per bucket and skips gaps", () => {
	const out = rollup(
		[
			{ t: 0, cpu: 10, mem: null },
			{ t: 30, cpu: 20, mem: 50 },
			{ t: 60, cpu: null, mem: 40 },
		],
		60,
		["cpu", "mem"],
	);
	assert.deepEqual(out, [
		{ t: 0, cpu: 15, mem: 50 },
		{ t: 60, cpu: null, mem: 40 },
	]);
});
