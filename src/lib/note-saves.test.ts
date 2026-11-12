import assert from "node:assert/strict";
import test from "node:test";
import { createNoteSaves } from "./note-saves";

test("saves run one at a time, in order", async () => {
	const log: string[] = [];
	const save = createNoteSaves(async (body) => {
		const { name } = body as { name: string };
		log.push(`start ${name}`);
		await new Promise((done) => setImmediate(done));
		log.push(`end ${name}`);
		return true;
	});
	const results = await Promise.all([
		save({ name: "a" }),
		save({ name: "b" }),
		save({ name: "c" }),
	]);
	assert.deepEqual(log, [
		"start a",
		"end a",
		"start b",
		"end b",
		"start c",
		"end c",
	]);
	assert.deepEqual(results, [true, true, true]);
});

test("a failed save does not block the next", async () => {
	let calls = 0;
	const save = createNoteSaves(async () => {
		calls += 1;
		if (calls === 1) throw new Error("network down");
		return true;
	});
	const results = await Promise.all([save({}), save({})]);
	assert.deepEqual(results, [false, true]);
});
