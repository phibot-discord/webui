import assert from "node:assert/strict";
import test from "node:test";
import { createKv, type RemoteKv } from "./kv";

function fakeRemote() {
	const data = new Map<string, string>();
	const calls = { get: 0, put: 0, del: 0 };
	const remote: RemoteKv = {
		label: "fake",
		getRaw: async (key) => {
			calls.get += 1;
			return data.get(key);
		},
		putRaw: async (key, value) => {
			calls.put += 1;
			data.set(key, value);
		},
		delRaw: async (key) => {
			calls.del += 1;
			data.delete(key);
		},
		listRaw: async (prefix) =>
			[...data.keys()].filter((k) => k.startsWith(prefix)),
		ping: async () => undefined,
	};
	return { remote, data, calls };
}

async function withNow<T>(now: () => number, fn: () => Promise<T>): Promise<T> {
	const orig = Date.now;
	Date.now = now;
	try {
		return await fn();
	} finally {
		Date.now = orig;
	}
}

test("plain keys are served from the overlay for a minute, then re-read", async () => {
	const { remote, data, calls } = fakeRemote();
	data.set("phi:infoFile", JSON.stringify({ d: "v1" }));
	const { store } = createKv(remote);
	let clock = 1_000_000;
	await withNow(
		() => clock,
		async () => {
			assert.equal(await store.get("phi:infoFile"), "v1");
			assert.equal(await store.get("phi:infoFile"), "v1");
			assert.equal(calls.get, 1);
			data.set("phi:infoFile", JSON.stringify({ d: "v2" }));
			clock += 30_000;
			assert.equal(await store.get("phi:infoFile"), "v1", "still cached");
			clock += 31_000;
			assert.equal(await store.get("phi:infoFile"), "v2", "aged out");
			assert.equal(calls.get, 2);
		},
	);
});

test("bind keys always go to the remote except right after our own write", async () => {
	const { remote, data, calls } = fakeRemote();
	data.set("phi:save:tk", JSON.stringify({ d: "old" }));
	const { store } = createKv(remote);
	let clock = 5_000_000;
	await withNow(
		() => clock,
		async () => {
			assert.equal(await store.get("phi:save:tk"), "old");
			assert.equal(await store.get("phi:save:tk"), "old");
			assert.equal(calls.get, 2, "no overlay for bind keys");
			await store.set("phi:manualSave:u", "mine");
			assert.equal(await store.get("phi:manualSave:u"), "mine");
			assert.equal(calls.get, 2, "fresh write is sticky");
			clock += 6_000;
			data.set("phi:manualSave:u", JSON.stringify({ d: "theirs" }));
			assert.equal(await store.get("phi:manualSave:u"), "theirs");
		},
	);
});

test("overlay size stays bounded", async () => {
	const { remote, data, calls } = fakeRemote();
	for (let i = 0; i < 1_050; i++)
		data.set(`phi:k:${i}`, JSON.stringify({ d: String(i) }));
	const { store } = createKv(remote);
	for (let i = 0; i < 1_050; i++) await store.get(`phi:k:${i}`);
	assert.equal(calls.get, 1_050);
	await store.get("phi:k:1049");
	assert.equal(calls.get, 1_050, "recent key still cached");
	await store.get("phi:k:0");
	assert.equal(calls.get, 1_051, "oldest key was evicted");
});

test("expired envelopes are dropped and deleted remotely", async () => {
	const { remote, data, calls } = fakeRemote();
	data.set("phi:t", JSON.stringify({ d: "x", e: 10 }));
	const { store } = createKv(remote);
	await withNow(
		() => 20,
		async () => {
			assert.equal(await store.get("phi:t"), null);
			assert.equal(await store.ttlMs("phi:t"), -2);
		},
	);
	await new Promise((r) => setImmediate(r));
	assert.equal(calls.del, 1);
});

test("non-blocking incr answers from the overlay and writes behind", async () => {
	const { remote, data, calls } = fakeRemote();
	let release!: () => void;
	const gate = new Promise<void>((r) => {
		release = r;
	});
	const slowPut = remote.putRaw;
	remote.putRaw = async (key, value, ttl) => {
		await gate;
		return slowPut(key, value, ttl);
	};
	const { store } = createKv(remote);
	await withNow(
		() => 7_000_000,
		async () => {
			const first = await store.incr("phi:webRl:ip:1.2.3.4:1", {
				ttlMs: 60_000,
				blocking: false,
			});
			assert.equal(first, 1, "count is available before the PUT lands");
			assert.equal(calls.put, 0);
			const second = await store.incr("phi:webRl:ip:1.2.3.4:1", {
				ttlMs: 60_000,
				blocking: false,
			});
			assert.equal(second, 2, "second count does not wait for the first PUT");
			assert.equal(await store.ttlMs("phi:webRl:ip:1.2.3.4:1"), 60_000);
			release();
			await new Promise((r) => setTimeout(r, 10));
			assert.equal(calls.put, 2, "both writes reached the remote in order");
			const stored = JSON.parse(data.get("phi:webRl:ip:1.2.3.4:1") ?? "{}");
			assert.equal(stored.d, "2");
			assert.equal(stored.e, 7_060_000, "ttl set once, on creation");
		},
	);
});

test("nx set refuses to overwrite and ttl reports remaining time", async () => {
	const { remote } = fakeRemote();
	const { store } = createKv(remote);
	await withNow(
		() => 1_000,
		async () => {
			assert.equal(
				await store.set("phi:lock", "1", { nx: true, ttlMs: 5_000 }),
				"OK",
			);
			assert.equal(
				await store.set("phi:lock", "2", { nx: true, ttlMs: 5_000 }),
				null,
			);
			assert.equal(await store.ttlMs("phi:lock"), 5_000);
			assert.equal(await store.get("phi:lock"), "1");
		},
	);
});
