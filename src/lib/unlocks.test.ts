import assert from "node:assert/strict";
import test from "node:test";
import type { CollectionIndex } from "./collection";
import type { GameKeyBlock } from "./game-key";
import {
	compactUnlocks,
	itemUnlock,
	parseUnlocks,
	parseUnlocksReply,
	tallyUnlocks,
	UNLOCKS_VERSION,
	type UnlockLists,
	unlocksReply,
} from "./unlocks";

const BLOCK: GameKeyBlock = {
	entries: [
		{ name: "shenqikuabao", types: ["read", "collection"], flags: [3, 4] },
		{ name: "alpa", types: ["read", "collection"], flags: [2, 2] },
		{ name: "675shijian", types: ["collection"], flags: [2] },
		{ name: "Glaciaxion", types: ["avatar"], flags: [1] },
		{ name: "Der Schneid", types: ["single", "illustration"], flags: [1, 1] },
		{
			name: "Retribution ~ Cycle of Redemption ~ ",
			types: ["illustration"],
			flags: [1],
		},
		{ name: "Cipher1", types: ["single", "avatar"], flags: [1, 1] },
		{ name: "Glaciaxion", types: ["avatar"], flags: [1] },
	],
	tail: [62, 1, 1, 1],
};

const LISTS: UnlockLists = {
	collection: { shenqikuabao: [4, 3], alpa: [2, 2], "675shijian": [2, 0] },
	avatar: ["Glaciaxion", "Cipher1"],
	single: ["Der Schneid", "Cipher1"],
	illustration: ["Der Schneid", "Retribution ~ Cycle of Redemption ~"],
};

test("the compact form keeps both counts per Collection key and the trimmed names of the rest", () => {
	assert.deepEqual(compactUnlocks(BLOCK), { v: UNLOCKS_VERSION, ...LISTS });
});

test("the compact form leaves the counts as the save has them", () => {
	const out = compactUnlocks({
		entries: [
			{ name: "big", types: ["read", "collection"], flags: [9, 12] },
			{ name: "readOnly", types: ["read"], flags: [1] },
		],
		tail: [],
	});
	assert.ok(!("error" in out));
	assert.deepEqual(out.collection, { big: [12, 9] });
});

test("a key named like an object property stays a plain key", () => {
	const out = compactUnlocks({
		entries: [{ name: "__proto__", types: ["collection"], flags: [1] }],
		tail: [],
	});
	assert.ok(!("error" in out));
	assert.deepEqual(Object.keys(out.collection), ["__proto__"]);
	assert.deepEqual(itemUnlock(out.collection, "__proto__", 1).state, "all");
	assert.deepEqual(itemUnlock(out.collection, "constructor", 1).state, "none");
});

test("the compact form of a save shaped like the measured one stays under 8 KB", () => {
	const name = (prefix: string, i: number, length: number) =>
		`${prefix}${String(i).padStart(length - prefix.length, "0")}`;
	const entries: GameKeyBlock["entries"] = [];
	for (let i = 0; i < 256; i++)
		entries.push({
			name: name("k", i, 12),
			types: i < 190 ? ["read", "collection"] : ["collection"],
			flags: i < 190 ? [1, 2] : [1],
		});
	for (let i = 0; i < 38; i++)
		entries.push({ name: name("a", i, 12), types: ["avatar"], flags: [1] });
	for (let i = 0; i < 89; i++)
		entries.push({
			name: name("s", i, 12),
			types:
				i < 10
					? ["single", "illustration"]
					: i < 34
						? ["single"]
						: ["illustration"],
			flags: i < 10 ? [1, 1] : [1],
		});
	assert.equal(entries.length, 383);
	const size = JSON.stringify(compactUnlocks({ entries, tail: [] })).length;
	assert.ok(size < 8_000, `${size} bytes`);
});

test("a stored field reads back through JSON, and an unreadable one keeps its reason", () => {
	const stored = JSON.parse(JSON.stringify(compactUnlocks(BLOCK)));
	assert.deepEqual(parseUnlocks(stored), { v: UNLOCKS_VERSION, ...LISTS });
	for (const error of ["missing", "version", "format"] as const)
		assert.deepEqual(parseUnlocks({ v: UNLOCKS_VERSION, error }), {
			v: UNLOCKS_VERSION,
			error,
		});
});

test("an absent, foreign or damaged field reads as absent", () => {
	const good = { v: UNLOCKS_VERSION, ...LISTS };
	for (const raw of [
		undefined,
		null,
		"x",
		{},
		{ ...good, v: 2 },
		{ v: UNLOCKS_VERSION, error: "other" },
		{ ...good, collection: [] },
		{ ...good, collection: { a: [1] } },
		{ ...good, collection: { a: [1, -1] } },
		{ ...good, collection: { a: [1.5, 0] } },
		{ ...good, collection: { a: [256, 0] } },
		{ ...good, avatar: [1] },
		{ ...good, single: undefined },
	])
		assert.equal(parseUnlocks(raw), undefined, JSON.stringify(raw));
});

test("an item's counts are capped at the entries the site lists, and read at unlocked", () => {
	const c = {
		a: [4, 3],
		b: [2, 2],
		c: [2, 5],
		d: [0, 0],
	} as UnlockLists["collection"];
	assert.deepEqual(itemUnlock(c, "a", 4), {
		entries: 4,
		unlocked: 4,
		read: 3,
		unread: 1,
		state: "all",
	});
	assert.deepEqual(itemUnlock(c, "b", 7), {
		entries: 7,
		unlocked: 2,
		read: 2,
		unread: 0,
		state: "some",
	});
	assert.deepEqual(itemUnlock(c, "c", 1), {
		entries: 1,
		unlocked: 1,
		read: 1,
		unread: 0,
		state: "all",
	});
	assert.equal(itemUnlock(c, "d", 3).state, "none");
	assert.deepEqual(itemUnlock(c, "missing", 3), {
		entries: 3,
		unlocked: 0,
		read: 0,
		unread: 0,
		state: "none",
	});
});

test("a tally counts unlocked and complete items and unread entries", () => {
	const c = { a: [4, 3], b: [2, 0], c: [3, 1] } as UnlockLists["collection"];
	assert.deepEqual(
		tallyUnlocks(c, [
			{ key: "a", entries: 4 },
			{ key: "b", entries: 7 },
			{ key: "c", entries: 1 },
			{ key: "z", entries: 3 },
		]),
		{ items: 4, unlocked: 3, full: 2, unread: 3 },
	);
	assert.deepEqual(tallyUnlocks(c, []), {
		items: 0,
		unlocked: 0,
		full: 0,
		unread: 0,
	});
});

const entries = (n: number) =>
	Array.from({ length: n }, (_, sub) => ({ sub, date: "", type: 0, info: [] }));

const INDEX: CollectionIndex = {
	chapters: [
		{ id: "c1", kind: "main", name: {}, label: null, unlock: null },
		{ id: "c2", kind: "main", name: {}, label: null, unlock: null },
	],
	items: [
		{ key: "shenqikuabao", chapter: "c1", entries: entries(4) },
		{ key: "alpa", chapter: "c1", entries: entries(7) },
		{ key: "mope3", chapter: "c2", entries: entries(3) },
		{ key: "675shijian", chapter: null, entries: entries(1) },
	],
};

test("the reply caps every known item, tallies each chapter and the whole Collection", () => {
	const reply = unlocksReply(
		{ ...LISTS, collection: { ...LISTS.collection, gone: [3, 1] } },
		INDEX,
	);
	assert.deepEqual(reply, {
		state: "ok",
		collection: {
			shenqikuabao: [4, 3],
			alpa: [2, 2],
			"675shijian": [1, 0],
			gone: [3, 1],
		},
		avatars: ["Glaciaxion", "Cipher1"],
		chapters: {
			c1: { items: 2, unlocked: 2, full: 1, unread: 1 },
			c2: { items: 1, unlocked: 0, full: 0, unread: 0 },
			other: { items: 1, unlocked: 1, full: 1, unread: 1 },
		},
		total: { items: 4, unlocked: 3, full: 2, unread: 2 },
	});
});

test("the reply has no Other group when every item is filed", () => {
	const reply = unlocksReply(LISTS, {
		...INDEX,
		items: INDEX.items.filter((item) => item.chapter),
	});
	assert.deepEqual(Object.keys(reply.chapters), ["c1", "c2"]);
});

test("the browser reads a reply back, and refuses a broken one", () => {
	const reply = unlocksReply(LISTS, INDEX);
	assert.deepEqual(parseUnlocksReply(JSON.parse(JSON.stringify(reply))), reply);
	for (const state of ["none", "manual", "refresh", "unreadable"] as const)
		assert.deepEqual(parseUnlocksReply({ state }), { state });
	for (const raw of [
		null,
		{ state: "other" },
		{ ...reply, collection: { a: "x" } },
		{ ...reply, avatars: "x" },
		{ ...reply, total: { items: 1 } },
		{
			...reply,
			chapters: { c1: { items: -1, unlocked: 0, full: 0, unread: 0 } },
		},
		{ ...reply, chapters: undefined },
	])
		assert.equal(parseUnlocksReply(raw), undefined, JSON.stringify(raw));
});
