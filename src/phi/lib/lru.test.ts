import assert from "node:assert/strict";
import test from "node:test";
import { evictOldest, evictToBudget, TtlLru } from "./lru";

test("evictOldest drops the entries added first", () => {
	const map = new Map<string, number>([
		["a", 1],
		["b", 2],
		["c", 3],
		["d", 4],
		["e", 5],
	]);
	evictOldest(map, 3);
	assert.deepEqual([...map.keys()], ["c", "d", "e"]);

	const atCap = new Map<string, number>([
		["a", 1],
		["b", 2],
		["c", 3],
	]);
	evictOldest(atCap, 3);
	assert.deepEqual([...atCap.keys()], ["a", "b", "c"]);

	const underCap = new Map<string, number>([["a", 1]]);
	evictOldest(underCap, 3);
	assert.deepEqual([...underCap.keys()], ["a"]);
});

test("evictToBudget drops the oldest entries until the total fits and returns the new total", () => {
	const map = new Map<string, Buffer>([
		["a", Buffer.alloc(10)],
		["b", Buffer.alloc(10)],
		["c", Buffer.alloc(10)],
	]);
	const total = evictToBudget(map, 30, 25, (value) => value.byteLength);
	assert.equal(total, 20);
	assert.deepEqual([...map.keys()], ["b", "c"]);
});

test("evictToBudget keeps the last entry even when it alone is over budget", () => {
	const map = new Map<string, Buffer>([["a", Buffer.alloc(100)]]);
	const total = evictToBudget(map, 100, 10, (value) => value.byteLength);
	assert.equal(total, 100);
	assert.deepEqual([...map.keys()], ["a"]);
});

test("a TtlLru entry expires, and writing a key again makes it the newest", () => {
	const lru = new TtlLru<number>(2);
	lru.set("a", 1, 60_000);
	lru.set("b", 2, 60_000);
	lru.set("a", 3, 60_000);
	lru.set("c", 4, 60_000);
	assert.equal(lru.peek("b"), undefined);
	assert.equal(lru.get("a"), 3);
	assert.equal(lru.get("c"), 4);

	const expiring = new TtlLru<number>(2);
	expiring.set("x", 7, -1);
	assert.equal(expiring.peek("x"), 7);
	assert.equal(expiring.get("x"), undefined);
	assert.equal(expiring.peek("x"), undefined);
});
