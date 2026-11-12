import assert from "node:assert/strict";
import test from "node:test";
import {
	autoTiers,
	cleanTitle,
	decodeTiers,
	encodeTiers,
	imageLayout,
	keyCode,
	type Placed,
	tileSpot,
} from "./tier-list";

test("a chart's code is four characters and does not change", () => {
	assert.equal(keyCode("A.B.0:IN"), "-eEH");
	assert.equal(keyCode("A.B.0:AT"), "Do2N");
});

test("a list survives a round trip through the address", () => {
	const keys = ["x:IN", "y:AT", "z:HD"];
	const placed: Placed = { "x:IN": "S", "z:HD": "D" };
	const raw = encodeTiers(keys, placed);
	assert.equal(raw.length, 10);
	assert.deepEqual(decodeTiers(keys, raw), placed);
});

test("charts that are not placed are not written", () => {
	const keys = ["x:IN", "y:AT", "z:HD"];
	assert.equal(encodeTiers(keys, {}), "");
	assert.equal(encodeTiers(keys, { "y:AT": "B" }), `${keyCode("y:AT")}B`);
});

test("a link made before a chart was added still places the old charts", () => {
	const raw = encodeTiers(["a:IN", "c:IN"], { "a:IN": "A", "c:IN": "C" });
	assert.deepEqual(decodeTiers(["a:IN", "b:IN", "c:IN"], raw), {
		"a:IN": "A",
		"c:IN": "C",
	});
});

test("a group with an unknown code or a letter that is not a row is ignored", () => {
	const keys = ["x:IN", "y:AT"];
	assert.deepEqual(decodeTiers(keys, "zzzzS"), {});
	assert.deepEqual(decodeTiers(keys, `${keyCode("x:IN")}X`), {});
	assert.deepEqual(
		decodeTiers(keys, `${keyCode("x:IN")}S${keyCode("y:AT").slice(0, 3)}`),
		{ "x:IN": "S" },
	);
});

test("played charts fall into five equal groups by accuracy, best first", () => {
	const items = Array.from({ length: 10 }, (_, i) => ({
		key: `s${i}:IN`,
		acc: 100 - i,
	}));
	const got = autoTiers([...items, { key: "none:IN", acc: null }]);
	assert.deepEqual(
		items.map((i) => got[i.key]),
		["S", "S", "A", "A", "B", "B", "C", "C", "D", "D"],
	);
	assert.equal("none:IN" in got, false);
});

test("fewer played charts than rows still start at S", () => {
	assert.deepEqual(
		autoTiers([
			{ key: "a:IN", acc: 99 },
			{ key: "b:IN", acc: 95 },
		]),
		{ "a:IN": "S", "b:IN": "B" },
	);
});

test("a title is trimmed, single-spaced and cut to 40 characters", () => {
	assert.equal(cleanTitle("  level   16\n\tfun  "), "level 16 fun");
	assert.equal(cleanTitle(undefined), "");
	assert.equal(cleanTitle("x".repeat(60)), "x".repeat(40));
	assert.equal([...cleanTitle("梯".repeat(50))].length, 40);
});

test("the picture has eight tiles per line and grows with its rows", () => {
	const layout = imageLayout([0, 9, 0, 0, 0]);
	assert.equal(layout.perLine, 8);
	assert.equal(layout.rows[1]?.height, 2 * 85 + 3 * 8);
	for (const i of [0, 2, 3, 4]) assert.equal(layout.rows[i]?.height, 101);
	assert.equal(layout.height, 96 + 4 * (101 + 8) + (194 + 8) + 56);
});

test("a tile's spot follows its line and column", () => {
	const layout = imageLayout([0, 9, 0, 0, 0]);
	assert.deepEqual(tileSpot(layout, 1, 9), {
		x: 32 + 120 + 168,
		y: (layout.rows[1]?.y ?? 0) + 8 + 93,
	});
});
