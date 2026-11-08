import assert from "node:assert/strict";
import test from "node:test";
import { tagExample } from "./tag-example";

const r3 = (n: number) => Math.round(n * 1000) / 1000;

test("the worked example matches the numbers printed on /tags", () => {
	const e = tagExample();
	assert.equal(e.min, 15.7);
	assert.deepEqual(
		e.rows.map((r) => [r.w, r3(r.y), r3(r.d)]),
		[
			[1, 2.046, 0.146],
			[1, 1.796, 0.016],
			[1, 1.495, -0.325],
		],
	);
	assert.deepEqual(e.rows[2]?.shares, [0, 30 / 67]);
	assert.deepEqual(e.average.map(r3), [0.02, -0.054]);
	assert.deepEqual(e.beta.map(r3), [0.093, -0.198]);
	assert.equal(r3(e.shift), -0.025);
	assert.deepEqual(e.net.map(r3), [0.035, -0.064]);
	assert.deepEqual(
		e.moves.map((m) => [m.row, m.tag, r3(m.after), r3(m.rks), r3(m.rksAfter)]),
		[
			[0, 0, 99.169, 15.366, 15.415],
			[2, 1, 96.289, 13.978, 13.638],
		],
	);
});

test("the example keeps the sign story the copy tells", () => {
	const e = tagExample();
	const [a, b, c] = e.rows;
	assert.ok(a && b && c);
	assert.ok(a.d > 0.05 && Math.abs(b.d) < 0.05 && c.d < -0.05);
	assert.ok(e.net[0] > 0 && e.net[1] < 0);
	assert.ok(Math.abs(e.net[1]) > Math.abs(e.average[1]));
});
