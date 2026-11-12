import assert from "node:assert/strict";
import test from "node:test";
import { pickKey, rememberPick } from "./chart-pick";

test("nothing to pick from gives nothing", () => {
	assert.equal(pickKey([], []), undefined);
});

test("the draw follows the random number", () => {
	const keys = ["a", "b", "c"];
	assert.equal(
		pickKey(keys, [], () => 0),
		"a",
	);
	assert.equal(
		pickKey(keys, [], () => 0.5),
		"b",
	);
	assert.equal(
		pickKey(keys, [], () => 0.999),
		"c",
	);
	assert.equal(
		pickKey(keys, [], () => 1),
		"c",
	);
});

test("recent picks are skipped while something else is left", () => {
	assert.equal(
		pickKey(["a", "b", "c"], ["a", "b"], () => 0),
		"c",
	);
});

test("when everything was picked recently the draw uses the whole list", () => {
	assert.equal(
		pickKey(["a"], ["a"], () => 0),
		"a",
	);
});

test("the memory is shorter than the list", () => {
	assert.deepEqual(rememberPick([], "a", 1), []);
	assert.deepEqual(rememberPick(["a"], "b", 2), ["b"]);
	let recent: string[] = [];
	const picks = Array.from({ length: 11 }, (_, i) => `k${i}`);
	for (const key of picks) recent = rememberPick(recent, key, 100);
	assert.deepEqual(recent, picks.slice(-10));
});

test("a chart picked again moves to the end of the memory", () => {
	assert.deepEqual(rememberPick(["a", "b"], "a", 50), ["b", "a"]);
});
