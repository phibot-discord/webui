import assert from "node:assert/strict";
import test from "node:test";
import { connectKv, createKv, type RemoteKv } from "./kv";

function fakeRemote() {
	const data = new Map<string, string>();
	const calls = { get: 0, put: 0, del: 0, background: 0 };
	const remote: RemoteKv = {
		label: "fake",
		getRaw: async (key) => {
			calls.get += 1;
			return data.get(key);
		},
		putRaw: async (key, value, _ttl, opts) => {
			calls.put += 1;
			if (opts?.background) calls.background += 1;
			data.set(key, value);
		},
		delRaw: async (key) => {
			calls.del += 1;
			data.delete(key);
		},
		listRaw: async (prefix) =>
			[...data.keys()].filter((k) => k.startsWith(prefix)),
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

test("expired envelopes are dropped and left to Cloudflare's TTL", async () => {
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
	assert.equal(calls.del, 0);
});

/** Holds the next remote read until `release()`, so a write can land while it is in flight */
function gateNextRead(remote: RemoteKv) {
	let release!: () => void;
	const gate = new Promise<void>((r) => {
		release = r;
	});
	const getRaw = remote.getRaw;
	remote.getRaw = async (key) => {
		remote.getRaw = getRaw;
		const raw = await getRaw(key);
		await gate;
		return raw;
	};
	return release;
}

for (const [label, before] of [
	["a missing copy", undefined],
	["an expired copy", JSON.stringify({ d: "old", e: 1 })],
	["an older live copy", JSON.stringify({ d: "old" })],
] as const) {
	test(`a write that lands while a read of ${label} is in flight is kept`, async () => {
		const { remote, data } = fakeRemote();
		if (before) data.set("phi:webQr:u", before);
		const { store } = createKv(remote);
		const release = gateNextRead(remote);
		const reading = store.get("phi:webQr:u");
		await store.set("phi:webQr:u", "new", { ttlMs: 120_000 });
		release();
		assert.equal(await reading, "new", "the read finished after the write");
		assert.equal(await store.get("phi:webQr:u"), "new");
		await new Promise((r) => setImmediate(r));
		assert.equal(JSON.parse(data.get("phi:webQr:u") ?? "{}").d, "new");
	});
}

for (const key of ["phi:qrbind:u", "phi:save:tk"]) {
	test(`a delete while a read of ${key} is in flight does not bring the old value back`, async () => {
		const { remote, data } = fakeRemote();
		data.set(key, JSON.stringify({ d: "old" }));
		const { store } = createKv(remote);
		const release = gateNextRead(remote);
		const reading = store.get(key);
		await store.del(key);
		const joining = store.get(key);
		release();
		assert.equal(await reading, null, "the read finished after the delete");
		assert.equal(await joining, null);
		assert.equal(await store.get(key), null);
		assert.equal(await store.set(key, "new", { nx: true }), "OK");
		assert.equal(await store.get(key), "new");
	});
}

test("a delete issued while a write is still queued leaves the key deleted", async () => {
	const { remote, data } = fakeRemote();
	const { store } = createKv(remote);
	const writing = store.set("phi:qrbind:u", "1", { ttlMs: 120_000 });
	await store.del("phi:qrbind:u");
	await writing;
	assert.equal(data.has("phi:qrbind:u"), false);
	assert.equal(await store.get("phi:qrbind:u"), null);
});

test("a delete that arrives during an nx claim applies after it", async () => {
	const { remote, data } = fakeRemote();
	data.set("phi:qrbind:u", JSON.stringify({ d: "1" }));
	const { store } = createKv(remote);
	const release = gateNextRead(remote);
	const claiming = store.set("phi:qrbind:u", "2", { nx: true });
	const deleting = store.del("phi:qrbind:u");
	release();
	assert.equal(await claiming, null, "the lock was held when the claim ran");
	await deleting;
	assert.equal(data.has("phi:qrbind:u"), false);
	assert.equal(await store.get("phi:qrbind:u"), null);
	assert.equal(await store.set("phi:qrbind:u", "3", { nx: true }), "OK");
});

test("a stale expired copy seen by another instance does not delete a newer write", async () => {
	const { remote, data } = fakeRemote();
	const stale: RemoteKv = {
		...remote,
		getRaw: async () => JSON.stringify({ d: "old", e: 1 }),
	};
	await createKv(remote).store.set("phi:lbBoard:x", "fresh", {
		ttlMs: 60_000,
	});
	assert.equal(await createKv(stale).store.get("phi:lbBoard:x"), null);
	await new Promise((r) => setImmediate(r));
	assert.equal(JSON.parse(data.get("phi:lbBoard:x") ?? "{}").d, "fresh");
});

test("claiming a lock whose expired copy is not purged yet keeps the new lock", async () => {
	const { remote, data } = fakeRemote();
	data.set("phi:cooldown:u", JSON.stringify({ d: "1", e: 1 }));
	const delRaw = remote.delRaw;
	remote.delRaw = async (key) => {
		await new Promise((r) => setTimeout(r, 5));
		return delRaw(key);
	};
	const { store } = createKv(remote);
	assert.equal(
		await store.set("phi:cooldown:u", "1", { nx: true, ttlMs: 120_000 }),
		"OK",
	);
	await new Promise((r) => setTimeout(r, 10));
	const stored = JSON.parse(data.get("phi:cooldown:u") ?? "{}");
	assert.ok(stored.e > Date.now(), "a late DELETE would drop the new lock");
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

test("connecting makes no remote calls (no KV LIST per cold start)", async () => {
	const { remote, calls } = fakeRemote();
	await connectKv(
		{ accountId: "a", namespaceId: "n", apiToken: "t" },
		() => remote,
	);
	await new Promise((r) => setTimeout(r, 5));
	assert.equal(calls.get + calls.put, 0);
});

test("a missing ban key is trusted for a minute, other misses for 3 s", async () => {
	const { remote, data, calls } = fakeRemote();
	const { store } = createKv(remote);
	let clock = 9_000_000;
	await withNow(
		() => clock,
		async () => {
			assert.equal(await store.get("phi:banSessionToken:tk"), null);
			assert.equal(await store.get("phi:webQr:u"), null);
			assert.equal(calls.get, 2);
			clock += 10_000;
			data.set("phi:banSessionToken:tk", JSON.stringify({ d: "1" }));
			data.set("phi:webQr:u", JSON.stringify({ d: "qr" }));
			assert.equal(
				await store.get("phi:banSessionToken:tk"),
				null,
				"still cached",
			);
			assert.equal(await store.get("phi:webQr:u"), "qr", "short miss expired");
			clock += 51_000;
			assert.equal(await store.get("phi:banSessionToken:tk"), "1");
		},
	);
});

test("background writes reach the remote as background", async () => {
	const { remote, calls } = fakeRemote();
	const { store } = createKv(remote);
	await store.set("phi:cardHeight:x", "123", {
		ttlMs: 60_000,
		background: true,
	});
	await store.set("phi:notes:u", "{}");
	assert.equal(calls.put, 2);
	assert.equal(calls.background, 1);
});
