import assert from "node:assert/strict";
import test from "node:test";
import {
	DIFF_TIERS,
	type DiffChart,
	type DiffLevel,
	type DiffTier,
	defaultLevel,
	difficultyTable,
	tierOf,
} from "./difficulty-table";

function chart(id: string, c: number, diff: number, rank = "IN"): DiffChart {
	return { id, song: id.replace(/\.0$/, ""), rank, c, acc: 98, diff };
}

function placed(levels: DiffLevel[]): Map<string, DiffTier> {
	const out = new Map<string, DiffTier>();
	for (const entry of levels) {
		for (const tier of DIFF_TIERS) {
			for (const c of entry.tiers[tier]) out.set(`${c.id}:${c.rank}`, tier);
		}
	}
	return out;
}

test("no charts give no table", () => {
	assert.deepEqual(difficultyTable([]), []);
	assert.equal(defaultLevel([]), undefined);
});

test("a level is the whole-number part of the constant, highest first", () => {
	const levels = difficultyTable([
		chart("A.0", 15.9, 0.5),
		chart("B.0", 15.0, -0.5),
		chart("C.0", 16.2, 0),
	]);
	assert.deepEqual(
		levels.map((l) => l.level),
		[16, 15],
	);
	assert.deepEqual(
		levels.map((l) => l.count),
		[1, 2],
	);
});

test("tiers follow the distance from the player's own average", () => {
	const input = [-2, -1, 0, 1, 2].map((diff, i) =>
		chart(`S${i}.0`, 14.5, diff),
	);
	const tiers = placed(difficultyTable(input));
	assert.deepEqual(
		input.map((c) => tiers.get(`${c.id}:${c.rank}`)),
		["wall", "hard", "even", "good", "great"],
	);
});

test("the cut-offs sit at a third and at one spread", () => {
	assert.equal(tierOf(1), "great");
	assert.equal(tierOf(0.35), "good");
	assert.equal(tierOf(0.34), "even");
	assert.equal(tierOf(-0.35), "hard");
	assert.equal(tierOf(-1), "wall");
});

test("identical results all land in the middle row", () => {
	const levels = difficultyTable([
		chart("A.0", 15.1, 0.3),
		chart("B.0", 15.6, 0.3),
		chart("C.0", 13.4, 0.3),
	]);
	assert.deepEqual([...placed(levels).values()], ["even", "even", "even"]);
});

test("inside a row the chart that suits the player best comes first, with a stable order on ties", () => {
	const input = [
		chart("D.0", 15.2, 0.1, "IN"),
		chart("C.0", 15.2, 0.1),
		chart("B.0", 15.8, 0.1),
		chart("X.0", 14.5, 10),
		chart("D.0", 15.2, 0.1, "AT"),
		chart("A.0", 15.3, 0.2),
		chart("Y.0", 14.5, -10),
	];
	const expected = ["A.0:IN", "B.0:IN", "C.0:IN", "D.0:AT", "D.0:IN"];
	for (const charts of [input, [...input].reverse()]) {
		const level = difficultyTable(charts).find((l) => l.level === 15);
		assert.deepEqual(
			level?.tiers.even.map((c) => `${c.id}:${c.rank}`),
			expected,
		);
	}
});

test("charts with a broken number are left out", () => {
	const levels = difficultyTable([
		chart("A.0", 15.2, Number.NaN),
		chart("B.0", 0, 0.4),
		chart("C.0", 14.7, 0.2),
		chart("D.0", 14.1, -0.2),
	]);
	const ids = [...placed(levels).keys()];
	assert.deepEqual(ids.sort(), ["C.0:IN", "D.0:IN"]);
	assert.deepEqual(
		levels.map((l) => l.level),
		[14],
	);
});

test("the default level is the one with the most charts, the highest on a tie", () => {
	const tied = difficultyTable([
		chart("A.0", 16.1, 0),
		chart("B.0", 16.4, 0.1),
		chart("C.0", 15.2, 0.2),
		chart("D.0", 15.8, 0.3),
		chart("E.0", 14.5, 0.4),
	]);
	assert.equal(defaultLevel(tied), 16);
	const crowded = difficultyTable([
		chart("A.0", 16.1, 0),
		chart("B.0", 14.4, 0.1),
		chart("C.0", 14.2, 0.2),
		chart("D.0", 14.8, 0.3),
		chart("E.0", 15.5, 0.4),
	]);
	assert.equal(defaultLevel(crowded), 14);
});
