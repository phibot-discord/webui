import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
	comparableUser,
	createShare,
	getCompareOptIn,
	moveShare,
	resetShareMemForTest,
	revokeShare,
	setCompareOptIn,
	userIdForSlug,
} from "./share";

const kv = new Map<string, string>();
const reads: string[] = [];
const db = {
	get: async (key: string) => {
		reads.push(key);
		return kv.get(key);
	},
	set: async (key: string, value: string) => {
		kv.set(key, value);
	},
	del: async (...keys: string[]) => {
		for (const k of keys) kv.delete(k);
	},
};
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
});

beforeEach(() => {
	kv.clear();
	reads.length = 0;
	resetShareMemForTest();
});

async function withClock<T>(clock: { now: number }, fn: () => Promise<T>) {
	const orig = Date.now;
	Date.now = () => clock.now;
	try {
		return await fn();
	} finally {
		Date.now = orig;
	}
}

test("a slug is looked up once a minute per process", async () => {
	kv.set("phi:webShare:abcdefgh1234", "u1");
	kv.set("phi:webShareUser:u1", "abcdefgh1234");
	const clock = { now: 80_000_000 };
	await withClock(clock, async () => {
		assert.equal(await userIdForSlug("abcdefgh1234"), "u1");
		assert.equal(await userIdForSlug("abcdefgh1234"), "u1");
		assert.equal(reads.length, 2);
		clock.now += 60_001;
		assert.equal(await userIdForSlug("abcdefgh1234"), "u1");
		assert.equal(reads.length, 4);
	});
});

test("unknown and malformed slugs are not remembered", async () => {
	assert.equal(await userIdForSlug("nosuchslug12"), undefined);
	kv.set("phi:webShare:nosuchslug12", "u2");
	kv.set("phi:webShareUser:u2", "nosuchslug12");
	assert.equal(
		await userIdForSlug("nosuchslug12"),
		"u2",
		"a new share works at once",
	);
	assert.equal(await userIdForSlug("bad slug!"), undefined);
	assert.equal(reads.length, 3, "malformed slugs never reach KV");
});

test("revoking forgets the slug in this process", async () => {
	const slug = await createShare("u3");
	assert.equal(await userIdForSlug(slug), "u3");
	assert.equal(
		reads.filter((k) => k === `phi:webShare:${slug}`).length,
		0,
		"served from the memo createShare filled",
	);
	await revokeShare("u3");
	assert.equal(await userIdForSlug(slug), undefined);
});

test("compare is off until the owner turns it on, and needs a share", async () => {
	assert.equal(await setCompareOptIn("u4", true), "no_share");
	const slug = await createShare("u4");
	assert.equal(await getCompareOptIn("u4"), false);
	assert.equal(await comparableUser(slug), undefined);
	assert.equal(await setCompareOptIn("u4", true), "ok");
	assert.equal(await getCompareOptIn("u4"), true);
	assert.equal(await comparableUser(slug), "u4");
	await setCompareOptIn("u4", false);
	assert.equal(await comparableUser(slug), undefined);
});

test("revoking the share drops compare, and a new share starts with it off", async () => {
	const slug = await createShare("u5");
	await setCompareOptIn("u5", true);
	await revokeShare("u5");
	assert.equal(kv.has(`phi:webCompare:${slug}`), false);
	assert.equal(await comparableUser(slug), undefined);
	const next = await createShare("u5");
	assert.notEqual(next, slug);
	assert.equal(await getCompareOptIn("u5"), false);
});

test("a slug that is not its owner's current slug resolves to nobody", async () => {
	kv.set("phi:webShare:slugAAAAAAAA", "u1");
	kv.set("phi:webShare:slugBBBBBBBB", "u1");
	kv.set("phi:webShareUser:u1", "slugBBBBBBBB");
	assert.equal(await userIdForSlug("slugAAAAAAAA"), undefined);
	assert.equal(await userIdForSlug("slugBBBBBBBB"), "u1");
});

test("a moved share resolves for its new owner", async () => {
	const slug = await createShare("a");
	await moveShare("a", "b");
	resetShareMemForTest();
	assert.equal(await userIdForSlug(slug), "b");
});

test("a share whose second write failed is replaced by the next one", async () => {
	const set = db.set;
	const forward: string[] = [];
	let failed = false;
	db.set = async (key: string, value: string) => {
		if (key.startsWith("phi:webShare:")) forward.push(key.slice(13));
		if (key === "phi:webShareUser:u1" && !failed) {
			failed = true;
			throw new Error("KV write failed");
		}
		return set(key, value);
	};
	try {
		await assert.rejects(() => createShare("u1"));
		const next = await createShare("u1");
		const [first] = forward;
		assert.ok(first);
		assert.notEqual(next, first);
		assert.equal(await userIdForSlug(next), "u1");
		assert.equal(await userIdForSlug(first), undefined);
	} finally {
		db.set = set;
	}
});

test("compare follows a moved share, and is dropped when the move revokes", async () => {
	const slug = await createShare("tap:a");
	await setCompareOptIn("tap:a", true);
	await moveShare("tap:a", "d1");
	assert.equal(await comparableUser(slug), "d1");
	assert.equal(await getCompareOptIn("d1"), true);

	const other = await createShare("tap:b");
	await setCompareOptIn("tap:b", true);
	await createShare("d2");
	await moveShare("tap:b", "d2");
	assert.equal(await comparableUser(other), undefined);
	assert.equal(kv.has(`phi:webCompare:${other}`), false);
});
