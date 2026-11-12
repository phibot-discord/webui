import assert from "node:assert/strict";
import test from "node:test";
import { playRange, shuffled } from "./jukebox";

const byValue = (a: number, b: number) => a - b;

test("a shuffle keeps every item exactly once", () => {
	for (const n of [0, 1, 50]) {
		const items = Array.from({ length: n }, (_, i) => i);
		assert.deepEqual(shuffled(items).sort(byValue), items);
	}
});

test("a shuffle follows the random numbers", () => {
	assert.deepEqual(
		shuffled([1, 2, 3], () => 0),
		[2, 3, 1],
	);
	assert.deepEqual(
		shuffled([1, 2, 3], () => 1),
		[1, 2, 3],
	);
});

test("the input array is not changed", () => {
	const items = [1, 2, 3, 4, 5];
	shuffled(items, () => 0);
	assert.deepEqual(items, [1, 2, 3, 4, 5]);
});

test("whole mode plays everything", () => {
	assert.deepEqual(playRange("whole", 80, 150), [0, 150]);
});

test("highlight mode plays the hardest half minute with a second of lead-in", () => {
	assert.deepEqual(playRange("highlight", 80, 150), [79, 110]);
});

test("a highlight at the very end is moved back to keep its length", () => {
	assert.deepEqual(playRange("highlight", 140, 150), [119, 150]);
});

test("a short chart is played whole in highlight mode", () => {
	assert.deepEqual(playRange("highlight", 5, 20), [0, 20]);
});

test("a chart without notes is played whole", () => {
	assert.deepEqual(playRange("highlight", null, 90), [0, 90]);
	assert.deepEqual(playRange("highlight", 80, 0), [0, 0]);
});
