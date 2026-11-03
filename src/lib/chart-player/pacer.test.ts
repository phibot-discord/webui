import assert from "node:assert/strict";
import test from "node:test";
import { Pacer } from "./pacer";

const run = (p: Pacer, deltas: number[]) => deltas.map((d) => p.step(d));

test("a steady 30 Hz display never lowers the resolution", () => {
	const p = new Pacer();
	const out = run(
		p,
		Array.from({ length: 3000 }, () => 33.3),
	);
	assert.ok(!out.includes(-1));
});

test("frames that keep missing a 60 Hz refresh step the resolution down", () => {
	const p = new Pacer();
	run(
		p,
		Array.from({ length: 60 }, () => 16.7),
	);
	const out = run(
		p,
		Array.from({ length: 120 }, (_, i) => (i % 4 === 3 ? 16.7 : 33.4)),
	);
	assert.ok(out.includes(-1));
});

test("sustained smooth frames step it back up, pauses are ignored", () => {
	const p = new Pacer();
	assert.equal(p.step(5000), 0);
	const out = run(
		p,
		Array.from({ length: 1000 }, () => 8.3),
	);
	assert.ok(out.includes(1));
});
