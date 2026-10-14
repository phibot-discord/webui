import assert from "node:assert/strict";
import test from "node:test";
import type { LevelKind } from "./const";
import { rankingScoreOf } from "./manual-score";
import {
	accFromScore,
	isBlank,
	type SimBaseRecord,
	type SimEdit,
	scoreFromAcc,
	simulate,
	withAcc,
	withAp,
	withScore,
} from "./simulation";

const IN: LevelKind = "IN";
const AT: LevelKind = "AT";

/** 27 played charts of constant 15 at accs from 99 down, so B27 is a clear cut-off */
function player(): SimBaseRecord[] {
	return Array.from(
		{ length: 27 },
		(_, i) => [`song-${i}`, IN, 99 - i * 0.5, 15] as const,
	);
}

const edit = (id: string, rank: LevelKind, acc: string): SimEdit => ({
	id,
	rank,
	acc,
});

test("with no edits the simulation changes nothing", () => {
	const r = simulate(player(), []);
	assert.equal(r.delta, 0);
	assert.equal(r.before, r.after);
	assert.deepEqual(r.left, []);
	assert.ok([...r.phi, ...r.best].every((s) => s.was === s.slot));
});

test("the RKS matches the in-game rule used by the manual page", () => {
	const base = [
		...player(),
		["ap-1", AT, 100, 16.5] as const,
		["ap-2", IN, 100, 15.5] as const,
	];
	const r = simulate(base, []);
	const expected = rankingScoreOf(
		base.map(([, , acc, difficulty]) => ({
			acc,
			rks: acc === 100 ? difficulty : difficulty * ((acc - 55) / 45) ** 2,
		})),
	);
	assert.ok(Math.abs(r.before - expected) < 1e-12);
	assert.deepEqual(
		r.phi.map((s) => s.id),
		["ap-1", "ap-2"],
	);
});

test("an edit at or below the real best changes nothing", () => {
	const base = player();
	const r = simulate(base, [
		edit("song-0", IN, "98"),
		edit("song-1", IN, "98.5"),
	]);
	assert.equal(r.delta, 0);
	assert.deepEqual(
		r.charts.map((c) => c.status),
		["no_gain", "no_gain"],
	);
	// The simulated RKS of the chart is still reported, for the row
	assert.ok((r.charts[0]?.newRks ?? 0) > 0);
});

test("a better acc raises the RKS by its chart gain over 30", () => {
	const base = player();
	const r = simulate(base, [edit("song-3", IN, "99.5")]);
	const old = 15 * ((97.5 - 55) / 45) ** 2;
	const now = 15 * ((99.5 - 55) / 45) ** 2;
	assert.ok(r.delta > 0);
	// song-3 is in B27 and, being now the best chart, stays a B slot only
	assert.ok(Math.abs(r.delta - (now - old) / 30) < 1e-9);
	assert.equal(r.best[0]?.id, "song-3");
	assert.equal(r.best[0]?.was, "B4");
	assert.equal(r.charts[0]?.status, "better");
});

test("an edit to 100 enters P3 and counts twice", () => {
	const base = player();
	const r = simulate(base, [edit("song-5", IN, "100")]);
	assert.deepEqual(
		r.phi.map((s) => [s.slot, s.id, s.was]),
		[["P1", "song-5", undefined]],
	);
	const old = 15 * ((96.5 - 55) / 45) ** 2;
	// 15 as a P slot plus the move within B27
	assert.ok(Math.abs(r.delta - (15 + 15 - old) / 30) < 1e-9);
	assert.equal(r.best[0]?.id, "song-5");
});

test("an unplayed chart can enter B27 and push the 27th chart out", () => {
	const base = player();
	const r = simulate(base, [edit("new-song", AT, "99")], (id, rank) =>
		id === "new-song" && rank === AT ? 16 : undefined,
	);
	assert.equal(r.best.length, 27);
	assert.ok(r.best.some((s) => s.id === "new-song" && s.was === undefined));
	assert.deepEqual(
		r.left.map((s) => [s.slot, s.id]),
		[["B27", "song-26"]],
	);
	assert.ok(r.delta > 0);
});

test("a chart without a known difficulty, or with a bad acc, is ignored", () => {
	const base = player();
	const r = simulate(base, [
		edit("new-song", AT, "99"),
		edit("song-2", IN, ""),
		edit("song-3", IN, "101"),
	]);
	assert.deepEqual(
		r.charts.map((c) => c.status),
		["unknown", "invalid", "invalid"],
	);
	assert.equal(r.delta, 0);
	// The difficulty remembered with the edit fills in until the catalog loads
	const remembered = simulate(base, [
		{ ...edit("new-song", AT, "99"), difficulty: 16 },
	]);
	assert.equal(remembered.charts[0]?.status, "better");
	assert.ok(remembered.delta > 0);
});

/** 27 charts of constant 15, and three APs of 16 / 15.5 / 15 */
function withThreeAps(): SimBaseRecord[] {
	return [
		...player(),
		["ap-a", AT, 100, 16, 1_000_000],
		["ap-b", AT, 100, 15.5, 1_000_000],
		["ap-c", IN, 100, 15, 1_000_000],
	];
}

test("marking a chart AP puts it in P3 when it beats one of the P slots", () => {
	const base = withThreeAps();
	// A played B chart whose AP value (15.3) is above the lowest P slot (15)
	const r = simulate(
		[...base, ["better", IN, 99.9, 15.3, 999_000]],
		[withAp(edit("better", IN, ""), true)],
	);
	assert.deepEqual(
		r.phi.map((s) => [s.slot, s.id]),
		[
			["P1", "ap-a"],
			["P2", "ap-b"],
			["P3", "better"],
		],
	);
	assert.equal(r.phi[2]?.was, undefined);
	assert.deepEqual(
		r.left.filter((s) => s.slot.startsWith("P")).map((s) => s.id),
		["ap-c"],
	);
	assert.ok(r.delta > 0);
});

test("an AP below every P slot leaves P3 alone but still improves its B slot", () => {
	const base = withThreeAps();
	const r = simulate(
		[...base, ["low", IN, 99.5, 14, 995_000]],
		[withAp(edit("low", IN, ""), true)],
	);
	assert.deepEqual(
		r.phi.map((s) => s.id),
		["ap-a", "ap-b", "ap-c"],
	);
	assert.deepEqual(
		r.left.filter((s) => s.slot.startsWith("P")),
		[],
	);
	const old = 14 * ((99.5 - 55) / 45) ** 2;
	// Its B slot, if it has one, moves from the chart value of 99.5 to 100
	const inB = r.best.some((s) => s.id === "low");
	assert.ok(r.delta >= 0);
	if (inB) assert.ok(Math.abs(r.delta - (14 - old) / 30) < 1e-9);
});

test("a chart in P3 and in B27 counts in both, and only its P slot is displaced", () => {
	const base = withThreeAps();
	const r = simulate(base, [withAp(edit("better", IN, ""), true)], (id) =>
		id === "better" ? 16.5 : undefined,
	);
	// 16.5 is the best AP: P1, and P3's old holder falls out of P only
	assert.equal(r.phi[0]?.id, "better");
	assert.equal(r.best[0]?.id, "better");
	const ap = r.left.filter((s) => s.id === "ap-c");
	assert.deepEqual(
		ap.map((s) => s.slot),
		["P3"],
	);
	assert.ok(r.best.some((s) => s.id === "ap-c"));
});

test("score and accuracy convert both ways under the full-combo reading", () => {
	assert.equal(accFromScore(1_000_000), 100);
	assert.equal(accFromScore(0), 0);
	assert.ok(Math.abs(accFromScore(990_000) - 98.8888888) < 1e-6);
	assert.equal(scoreFromAcc(100), 1_000_000);
	assert.equal(scoreFromAcc(98.5), 98.5 * 9000 + 100_000);
	for (const score of [100_000, 500_000, 950_000, 999_999]) {
		assert.ok(Math.abs(scoreFromAcc(accFromScore(score)) - score) <= 1);
	}
});

test("the accuracy and the score move together", () => {
	const blank = edit("x", IN, "");
	assert.equal(isBlank(blank), true);
	const typed = withScore(blank, "985,000x");
	assert.equal(typed.score, "985000");
	assert.equal(typed.acc, String(98.333333));
	assert.equal(isBlank(typed), false);
	// A blank score keeps the accuracy it set
	const cleared = withScore(typed, "");
	assert.equal(cleared.score, undefined);
	assert.equal(cleared.acc, typed.acc);
	// Typing the accuracy sets the score to its full-combo reading
	const acc = withAcc(typed, "99.1a");
	assert.deepEqual([acc.acc, acc.score], ["99.1", String(scoreFromAcc(99.1))]);
	// A half-typed or empty accuracy has no score
	assert.equal(withAcc(typed, "").score, undefined);
	assert.equal(withAcc(typed, "101").score, undefined);
	// 1,000,000 is an AP; an impossible score leaves the accuracy alone
	assert.equal(withScore(blank, "1000000").acc, "100");
	assert.equal(withScore(withAcc(blank, "97"), "1000001").acc, "97");
	assert.equal(withAp(blank, true).acc, "100");
	assert.equal(withAp(withAp(blank, true), false).acc, "");
});
