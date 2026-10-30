import assert from "node:assert/strict";
import test from "node:test";
import type { LevelKind } from "./const";
import { type SimBaseRecord, simulate } from "./simulation";
import { rksGoal, sortTargets, targetsFor } from "./targets";

function seeded(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 2 ** 32;
	};
}

const RANKS: LevelKind[] = ["EZ", "HD", "IN", "AT"];

function randomSave(seed: number, n: number): SimBaseRecord[] {
	const rnd = seeded(seed);
	const out: SimBaseRecord[] = [];
	for (let i = 0; i < n; i++) {
		const difficulty = Math.round((1 + rnd() * 16.5) * 10) / 10;
		const acc =
			rnd() < 0.08 ? 100 : Math.round((80 + rnd() * 19.99) * 1e4) / 1e4;
		out.push([`song${i}.0`, RANKS[i % 4]!, acc, difficulty]);
	}
	return out;
}

const after = (
	base: SimBaseRecord[],
	id: string,
	rank: LevelKind,
	acc: number,
	difficulty?: number,
) =>
	simulate(
		base,
		[{ id, rank, acc: Math.min(100, acc).toFixed(6) }],
		() => difficulty,
	).after;

test("the goal is the next 0.005 step above the current RKS", () => {
	assert.equal(rksGoal(16.7073).toFixed(4), "16.7150");
	assert.equal(rksGoal(16.701).toFixed(4), "16.7050");
	assert.equal(rksGoal(16.705).toFixed(4), "16.7150");
});

test("every reachable target is the lowest accuracy that reaches the goal", () => {
	for (const seed of [1, 2, 3, 4, 5]) {
		const base = randomSave(seed, 60);
		const { rks, goal, targets } = targetsFor(base);
		assert.ok(
			Math.abs(rks - simulate(base, []).before) < 1e-9,
			"same RKS as the simulation",
		);
		let checked = 0;
		for (const t of targets) {
			if (t.need == null) continue;
			const hit = after(base, t.id, t.rank, t.need + 2e-6);
			assert.ok(hit >= goal - 1e-9, `${t.id} ${t.rank} reaches the goal`);
			if (!t.viaAp && t.need > 70.001) {
				const miss = after(base, t.id, t.rank, t.need - 1e-3);
				assert.ok(miss < goal, `${t.id} ${t.rank} lower accuracy misses`);
			}
			if (t.viaAp) {
				const miss = after(base, t.id, t.rank, 99.9999);
				assert.ok(miss < goal, `${t.id} ${t.rank} needs the AP`);
			}
			checked++;
		}
		assert.ok(checked > 0);
	}
});

test("unreachable charts are reported, never given an accuracy", () => {
	const base = randomSave(9, 80);
	const { goal, targets } = targetsFor(base);
	for (const t of targets.filter((x) => x.need == null)) {
		assert.ok(after(base, t.id, t.rank, 100) < goal);
	}
});

test("unplayed catalog charts get a target from scratch", () => {
	const base = randomSave(7, 40);
	const { goal, targets } = targetsFor(base, [
		{ id: "new.0", rank: "AT", difficulty: 17.6 },
	]);
	const t = targets.find((x) => x.id === "new.0");
	assert.ok(t?.need != null);
	assert.equal(t.acc, null);
	assert.ok(after(base, "new.0", "AT", t.need + 2e-6, 17.6) >= goal - 1e-9);
});

test("APs are skipped and the sort keeps unreachable charts last", () => {
	const base: SimBaseRecord[] = [
		["a.0", "IN", 100, 15],
		["b.0", "IN", 99, 15],
		["c.0", "IN", 90, 2],
	];
	const { targets } = targetsFor(base);
	assert.ok(!targets.some((t) => t.id === "a.0"));
	const sorted = sortTargets(targets, "gap");
	const firstNull = sorted.findIndex((t) => t.need == null);
	if (firstNull >= 0) {
		assert.ok(sorted.slice(firstNull).every((t) => t.need == null));
	}
});
