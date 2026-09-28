import assert from "node:assert/strict";
import test from "node:test";
import {
	accuracyOf,
	comboFeasible,
	exactScore,
	hitsTarget,
	MAX_SCORE,
	planScore,
	SCORE_TOLERANCE,
	type ScoreMode,
	scoreFor,
} from "./score-control";

function checkPlans(total: number, target: number, mode: ScoreMode) {
	const { plans } = planScore(total, target, mode);
	for (const p of plans) {
		assert.equal(p.perfect + p.good + p.badMiss, total);
		const exact = exactScore(p.perfect, p.good, p.maxCombo, total, mode);
		assert.ok(Math.abs(p.exact - exact) < 1e-9);
		assert.ok(Math.abs(p.exact - target) < SCORE_TOLERANCE);
		assert.ok(Math.abs(p.delta - (exact - target)) < 1e-9);
		if (mode === "normal") {
			assert.ok(comboFeasible(p.perfect, p.good, p.badMiss, p.maxCombo, total));
		}
		assert.ok(Math.abs(p.acc - accuracyOf(p.perfect, p.good, total)) < 1e-9);
	}
	return plans;
}

test("Spasmodic AT 999058: the real FC + 5 Good split is listed with its exact values", () => {
	// In game: 1671 notes, score 999058, accuracy shown as 99.90.
	const { plans } = planScore(1671, 999_058);
	const mine = plans.find((p) => p.perfect === 1666 && p.good === 5);
	assert.ok(mine, "split missing");
	assert.equal(mine.badMiss, 0);
	assert.equal(mine.maxCombo, 1671);
	assert.equal(mine.exact.toFixed(2), "999057.45");
	assert.equal(mine.acc.toFixed(5), "99.89527");
	assert.equal(mine.acc.toFixed(2), "99.90");
	// It is the closest split, so it comes first.
	assert.equal(plans[0], mine);
	// The same split is also offered for 999057.
	assert.ok(
		planScore(1671, 999_057).plans.some(
			(p) => p.perfect === 1666 && p.good === 5,
		),
	);
});

test("all perfect is the only way to 1,000,000", () => {
	const { plans } = planScore(1000, MAX_SCORE);
	assert.deepEqual(
		plans.map((p) => [p.perfect, p.good, p.badMiss, p.maxCombo]),
		[[1000, 0, 0, 1000]],
	);
	assert.equal(plans[0]?.acc, 100);
	assert.equal(plans[0]?.exact, MAX_SCORE);
	assert.equal(plans[0]?.delta, 0);
});

test("zero score means every note broken", () => {
	const { plans } = planScore(500, 0);
	assert.equal(plans.length, 1);
	assert.deepEqual(
		[plans[0]?.perfect, plans[0]?.good, plans[0]?.badMiss, plans[0]?.maxCombo],
		[0, 0, 500, 0],
	);
});

test("rejects out-of-range input", () => {
	assert.deepEqual(planScore(0, 1000), { plans: [] });
	assert.deepEqual(planScore(100, MAX_SCORE + 1), { plans: [] });
	assert.deepEqual(planScore(100, -1), { plans: [] });
	assert.deepEqual(planScore(100.5, 1000), { plans: [] });
});

test("plans are sorted by closeness, then fewest Goods", () => {
	const plans = checkPlans(1200, 987_654, "normal");
	assert.ok(plans.length > 0);
	for (let i = 1; i < plans.length; i++) {
		const a = plans[i - 1]!;
		const b = plans[i]!;
		const da = Math.abs(a.delta);
		const db = Math.abs(b.delta);
		assert.ok(da <= db + 1e-9, "closest first");
		if (Math.abs(da - db) < 1e-9) assert.ok(a.good <= b.good, "fewer goods");
	}
});

test("a combo of N with a broken note is impossible", () => {
	assert.equal(comboFeasible(999, 0, 1, 1000, 1000), false);
	assert.equal(comboFeasible(999, 0, 1, 999, 1000), true);
	assert.equal(comboFeasible(1000, 0, 0, 999, 1000), false);
	// 2 breaks split 998 hits into 3 runs → longest run ≥ 333
	assert.equal(comboFeasible(998, 0, 2, 332, 1000), false);
	assert.equal(comboFeasible(998, 0, 2, 333, 1000), true);
});

test("challenge mode ignores combo and only counts judgements", () => {
	const target = scoreFor(790, 8, 0, 800, "challenge");
	const plans = checkPlans(800, target, "challenge");
	assert.ok(plans.some((p) => p.perfect === 790 && p.good === 8));
	for (const p of plans) assert.equal(p.maxCombo, p.perfect + p.good);
	assert.equal(target, 994_000);
});

test("matches an exhaustive enumeration for a small chart", () => {
	const total = 60;
	const splits: { p: number; g: number; c: number; exact: number }[] = [];
	for (let p = 0; p <= total; p++) {
		for (let g = 0; p + g <= total; g++) {
			for (let c = 0; c <= p + g; c++) {
				if (!comboFeasible(p, g, total - p - g, c, total)) continue;
				splits.push({ p, g, c, exact: exactScore(p, g, c, total) });
			}
		}
	}
	for (let s = 0; s <= MAX_SCORE; s += 991) {
		const expected = splits.filter((x) => hitsTarget(x.exact, s));
		const { plans } = planScore(total, s);
		assert.equal(plans.length, expected.length, `score ${s}`);
		for (const x of expected) {
			assert.ok(
				plans.some(
					(pl) => pl.perfect === x.p && pl.good === x.g && pl.maxCombo === x.c,
				),
				`score ${s} missing ${x.p}/${x.g}/c${x.c}`,
			);
		}
	}
});

test("every reachable score is found for a mid-size chart", () => {
	const total = 97;
	for (let seed = 0; seed < 60; seed++) {
		const perfect = (seed * 37) % (total + 1);
		const good = (seed * 11) % (total - perfect + 1);
		const badMiss = total - perfect - good;
		const hit = perfect + good;
		const maxCombo =
			badMiss === 0 ? total : Math.max(Math.ceil(hit / (badMiss + 1)), 0);
		const exact = exactScore(perfect, good, maxCombo, total);
		for (const target of [Math.floor(exact), Math.ceil(exact)]) {
			if (!hitsTarget(exact, target)) continue;
			const { plans } = planScore(total, target);
			assert.ok(
				plans.some(
					(p) =>
						p.perfect === perfect && p.good === good && p.maxCombo === maxCombo,
				),
				`missed ${perfect}/${good}/${badMiss} c${maxCombo} → ${target}`,
			);
		}
	}
});

test("unreachable targets report the nearest reachable scores", () => {
	// 1000 notes: FC with one Good is exactly 999685; nothing lies near 999999.
	const res = planScore(1000, 999_999);
	assert.equal(res.plans.length, 0);
	assert.ok(res.nearest);
	assert.equal(res.nearest?.below, 999_685);
	assert.equal(res.nearest?.above, MAX_SCORE);
});
