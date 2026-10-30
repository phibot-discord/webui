import assert from "node:assert/strict";
import test from "node:test";
import { pickIndex, rngFrom, seedBytes } from "./guess";

test("the answer depends on the secret, not just the puzzle id", () => {
	const ids = Array.from(
		{ length: 40 },
		(_, i) => `d-2026-11-${String(i).padStart(2, "0")}`,
	);
	const a = ids.map((id) => pickIndex(id, 300, "secret-a"));
	const b = ids.map((id) => pickIndex(id, 300, "secret-b"));
	assert.notDeepEqual(a, b);
	assert.deepEqual(
		a,
		ids.map((id) => pickIndex(id, 300, "secret-a")),
		"stable for the same secret",
	);
	assert.ok(a.every((i) => i >= 0 && i < 300));
	assert.equal(pickIndex("x", 0, "k"), -1);
});

test("the seeded generator repeats and spreads", () => {
	const one = rngFrom(seedBytes("step:x:0", "k"));
	const two = rngFrom(seedBytes("step:x:0", "k"));
	const xs = Array.from({ length: 1000 }, () => one());
	assert.deepEqual(
		xs.slice(0, 5),
		Array.from({ length: 5 }, () => two()),
	);
	assert.ok(xs.every((x) => x >= 0 && x < 1));
	const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
	assert.ok(mean > 0.4 && mean < 0.6);
});
