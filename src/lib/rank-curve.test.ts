import assert from "node:assert/strict";
import test from "node:test";
import { boardRank, curveLow, curvePoints, milestones } from "./rank-curve";

const linear = (n: number) => {
	const q: number[] = [];
	for (let k = 0; k <= 200; k++)
		q.push(Math.round((100 - k * 0.05) * 1e4) / 1e4);
	return { n, ap: 3, fc: 10, q, at: 0 };
};

test("a rank comes off the quantiles", () => {
	const board = linear(2000);
	assert.deepEqual(boardRank(board, 100), {
		rank: 1,
		of: 2001,
		top: 100 / 2001,
		tied: 3,
	});
	const mid = boardRank(board, 95);
	assert.ok(mid && Math.abs(mid.rank - 1000) <= 12, `rank ${mid?.rank}`);
	const low = boardRank(board, 50);
	assert.equal(low?.rank, 2001);
	const top = boardRank({ ...board, q: [99, ...board.q.slice(1)] }, 99.5);
	assert.equal(top?.rank, 1);
	assert.equal(boardRank({ ...board, n: 0 }, 99), null);
});

test("better accuracy never ranks worse", () => {
	const board = linear(500);
	let last = Number.POSITIVE_INFINITY;
	for (let acc = 90; acc < 100; acc += 0.13) {
		const r = boardRank(board, acc)?.rank ?? Number.POSITIVE_INFINITY;
		assert.ok(r <= last, `${acc}: ${r} > ${last}`);
		last = r;
	}
});

test("milestones step up from the current accuracy", () => {
	assert.deepEqual(milestones(98.9), [98.9, 99.15, 99.4, 99.9, 100]);
	assert.deepEqual(milestones(99.6), [99.6, 99.85, 100]);
	assert.deepEqual(milestones(100), [100]);
	assert.deepEqual(milestones(null), [98, 99, 99.5, 100]);
});

test("the curve stops at its low edge", () => {
	const board = linear(1000);
	const lo = curveLow(board);
	assert.equal(lo, 90.5);
	const points = curvePoints(board, lo);
	assert.ok(points.every(([acc]) => acc >= lo));
	assert.equal(points[0]?.[0], 100);
});
