import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { PRACTICE_MAX, type PracticeItem } from "@/lib/practice-list";
import {
	dropPracticeItem,
	getPracticeList,
	keepPracticeItem,
} from "./practice-list";

const kv = new Map<string, string>();
const writes: string[] = [];
const db = {
	get: async (key: string) => kv.get(key),
	set: async (key: string, value: string) => {
		writes.push(`set:${key}`);
		kv.set(key, value);
	},
	del: async (...keys: string[]) => {
		for (const k of keys) {
			writes.push(`del:${k}`);
			kv.delete(k);
		}
	},
};
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
});

beforeEach(() => {
	kv.clear();
	writes.length = 0;
});

const KEY = "phi:webPracticeList:u1";
const item = (id: string, at = 1): PracticeItem => ({
	id,
	rank: "IN",
	goal: "acc",
	value: 98.5,
	at,
});

test("an empty list reads as empty without a write", async () => {
	assert.deepEqual(await getPracticeList("u1"), []);
	assert.deepEqual(writes, []);
});

test("keeping a chart writes one record under phi:webPracticeList:<user>", async () => {
	assert.equal(await keepPracticeItem("u1", item("A.B.0", 5)), "ok");
	assert.deepEqual(writes, [`set:${KEY}`]);
	const stored = JSON.parse(kv.get(KEY) ?? "null");
	assert.equal(stored.v, 1);
	assert.deepEqual(stored.items, [item("A.B.0", 5)]);
	assert.deepEqual(await getPracticeList("u1"), [item("A.B.0", 5)]);
});

test("dropping the last chart deletes the record", async () => {
	await keepPracticeItem("u1", item("A.B.0"));
	await dropPracticeItem("u1", "A.B.0", "IN");
	assert.equal(kv.has(KEY), false);
	assert.equal(writes.at(-1), `del:${KEY}`);
});

test("dropping a chart that is not listed writes nothing", async () => {
	await keepPracticeItem("u1", item("A.B.0"));
	writes.length = 0;
	await dropPracticeItem("u1", "C.D.0", "IN");
	await dropPracticeItem("u1", "A.B.0", "AT");
	await dropPracticeItem("u2", "A.B.0", "IN");
	assert.deepEqual(writes, []);
	assert.equal(kv.has(KEY), true);
});

test("a full list is reported and left as it was", async () => {
	const items = Array.from({ length: PRACTICE_MAX }, (_, i) =>
		item(`S${i}.A.0`, i),
	);
	const before = JSON.stringify({ v: 1, items });
	kv.set(KEY, before);
	assert.equal(await keepPracticeItem("u1", item("New.A.0", 99)), "full");
	assert.deepEqual(writes, []);
	assert.equal(kv.get(KEY), before);
});
