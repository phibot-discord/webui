import assert from "node:assert/strict";
import test from "node:test";
import type { LevelKind } from "./const";
import { type SimBaseRecord, simulate } from "./simulation";
import {
	headerRks,
	rksGoal,
	roundUp,
	shownGoal,
	sortTargets,
	targetsFor,
} from "./targets";

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
	assert.equal(shownGoal(rksGoal(16.0412)), "16.05");
	assert.equal(shownGoal(rksGoal(16.0462)), "16.06");
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

test("roundUp never rounds down and ignores float noise", () => {
	assert.equal(roundUp(99.92263720367862, 2), 99.93);
	assert.equal(roundUp(99.92263720367862, 4), 99.9227);
	assert.equal(roundUp(98.0002, 4), 98.0002);
	assert.equal(roundUp(70, 4), 70);
	assert.equal(roundUp(99.99995, 4), 100);
});

test("a target rounded up still reaches the goal where rounding to nearest misses", () => {
	const base: SimBaseRecord[] = [
		["PA.p.0", "IN", 100, 16],
		["PB.p.0", "IN", 100, 15.5],
		["PC.p.0", "IN", 100, 14.95],
		["T.t.0", "IN", 99.9, 15],
		["F.f.0", "IN", 98.4, 10],
	];
	const { goal, targets } = targetsFor(base);
	const t = targets.find((x) => x.id === "T.t.0");
	assert.ok(t?.need != null);
	assert.equal(t.viaAp, false);
	assert.equal(t.need, 99.92263720367862);
	assert.equal(goal.toFixed(3), "3.905");
	assert.ok(after(base, "T.t.0", "IN", roundUp(t.need, 2)) >= goal);
	assert.ok(after(base, "T.t.0", "IN", roundUp(t.need, 4)) >= goal);
	assert.ok(after(base, "T.t.0", "IN", Number(t.need.toFixed(2))) < goal);
	assert.ok(after(base, "T.t.0", "IN", Number(t.need.toFixed(4))) < goal);
});

test("headerRks keeps the stored RKS when it is closer than 0.0001", () => {
	assert.equal(headerRks(16.1, 16.1), 16.1);
	const stored = Math.fround(16.7075499);
	assert.equal(stored, 16.707550048828125);
	assert.equal(headerRks(stored, 16.7075499), stored);
	assert.equal(stored.toFixed(4), "16.7076");
	assert.equal((16.7075499).toFixed(4), "16.7075");
	assert.equal(headerRks(16.5, 16.50009999), 16.5);
	assert.equal(headerRks(16.50009999, 16.5), 16.50009999);
	assert.equal(headerRks(16, 16.0001), 16);
});

test("headerRks prints the recomputed RKS at a difference of 0.0001 or more", () => {
	assert.equal(headerRks(0, 0.0001), 0.0001);
	assert.equal(headerRks(0.0001, 0), 0);
	assert.equal(headerRks(16, 16.00010001), 16.00010001);
	assert.equal(headerRks(16.00010001, 16), 16);
	assert.equal(headerRks(15, 0.3160493827160494), 0.3160493827160494);
	assert.equal(headerRks(3.9, 3.904497942386832), 3.904497942386832);
});

test("headerRks prints the recomputed RKS when the stored one is not a finite number", () => {
	assert.equal(headerRks(Number.NaN, 3.9045), 3.9045);
	assert.equal(headerRks(Number.POSITIVE_INFINITY, 3.9045), 3.9045);
	assert.equal(headerRks(Number(undefined), 3.9045), 3.9045);
});
