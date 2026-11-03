import assert from "node:assert/strict";
import test from "node:test";
import {
	clueToken,
	clueTokenOk,
	pickAnswer,
	rngFrom,
	seedBytes,
} from "./guess";

const POOL = Array.from({ length: 300 }, (_, i) => ({ id: `song${i}` }));
const IDS = Array.from(
	{ length: 40 },
	(_, i) => `d-2026-11-${String(i).padStart(2, "0")}`,
);

test("the answer depends on the secret, not just the puzzle id", () => {
	const a = IDS.map((id) => pickAnswer(id, POOL, "secret-a")?.id);
	const b = IDS.map((id) => pickAnswer(id, POOL, "secret-b")?.id);
	assert.notDeepEqual(a, b);
	assert.deepEqual(
		a,
		IDS.map((id) => pickAnswer(id, POOL, "secret-a")?.id),
		"stable for the same secret",
	);
	assert.equal(pickAnswer("x", [], "k"), undefined);
});

test("a catalog change only moves the answers it has to", () => {
	const before = IDS.map((id) => pickAnswer(id, POOL, "k")?.id);
	const grown = [
		...POOL,
		...Array.from({ length: 5 }, (_, i) => ({ id: `new${i}` })),
	];
	const after = IDS.map((id) => pickAnswer(id, grown, "k")?.id);
	const moved = after.filter((id, i) => id !== before[i]);
	assert.ok(moved.every((id) => id?.startsWith("new")));
	assert.ok(moved.length <= 3);
	const gone = before[0];
	const shrunk = POOL.filter((s) => s.id !== gone);
	const kept = IDS.map((id) => pickAnswer(id, shrunk, "k")?.id);
	assert.deepEqual(
		kept.filter((id, i) => id !== before[i]).length,
		before.filter((id) => id === gone).length,
	);
});

test("clue tokens are tied to the puzzle and the step", () => {
	const token = clueToken("d-2026-11-03", 2, "k");
	assert.ok(clueTokenOk("d-2026-11-03", 2, token, "k"));
	assert.ok(!clueTokenOk("d-2026-11-03", 5, token, "k"));
	assert.ok(!clueTokenOk("d-2026-11-04", 2, token, "k"));
	assert.ok(!clueTokenOk("d-2026-11-03", 2, "short", "k"));
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
