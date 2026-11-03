import assert from "node:assert/strict";
import test from "node:test";
import {
	buildSimilarIndex,
	type ChartFeature,
	parseBpm,
	parseLength,
	similarTo,
	suggestFrom,
} from "./similar";

const chart = (
	id: string,
	c: number,
	kinds: [number, number, number, number],
	length = 120,
	bpm = 180,
	rank = "IN",
): ChartFeature => ({
	id,
	rank,
	c,
	notes: kinds.reduce((a, b) => a + b, 0),
	kinds: { tap: kinds[0], drag: kinds[1], hold: kinds[2], flick: kinds[3] },
	length,
	bpm,
});

const LIST = [
	chart("Tappy", 14.5, [900, 50, 30, 20]),
	chart("Tappy2", 14.7, [880, 60, 40, 20]),
	chart("Draggy", 14.6, [200, 700, 50, 50]),
	chart("Holdy", 14.4, [300, 50, 600, 50]),
	chart("Hard", 16.5, [900, 50, 30, 20]),
	chart("Easy", 6.0, [300, 10, 10, 5]),
];

test("length and BPM strings parse", () => {
	assert.equal(parseLength("2:35"), 155);
	assert.equal(parseLength("--"), null);
	assert.equal(parseBpm("150-200"), 200);
	assert.equal(parseBpm("194"), 194);
	assert.equal(parseBpm(""), null);
});

test("the nearest chart shares the note mix and level", () => {
	const index = buildSimilarIndex(LIST);
	const hits = similarTo(index, "Tappy", "IN");
	assert.equal(hits[0]?.id, "Tappy2");
	assert.ok(
		!hits.some((h) => h.id === "Hard"),
		"constant gap over 1.5 is left out",
	);
	assert.ok(
		!hits.some((h) => h.id === "Tappy"),
		"the chart itself is left out",
	);
	assert.deepEqual(similarTo(index, "Nope", "IN"), []);
});

test("suggestions pick wanted charts close to a seed", () => {
	const index = buildSimilarIndex(LIST);
	const got = suggestFrom(
		index,
		[{ id: "Tappy", rank: "IN" }],
		(f) => f.id !== "Tappy",
		2,
	);
	assert.equal(got[0]?.id, "Tappy2");
	assert.deepEqual(got[0]?.seed, { id: "Tappy", rank: "IN" });
	assert.ok(!got.some((s) => s.id === "Hard"));
	assert.deepEqual(
		suggestFrom(index, [], () => true),
		[],
	);
});
