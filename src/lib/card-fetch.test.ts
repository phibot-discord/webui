import assert from "node:assert/strict";
import test from "node:test";
import {
	clearCardBlobs,
	loadCardBlob,
	peekCardBlob,
	resetCardFetchCacheForTest,
} from "./card-fetch";
import { CARD_STATS_HEADER, encodeCardStats } from "./card-stats";

test("loadCardBlob reuses an in-flight fetch for the same src", async () => {
	resetCardFetchCacheForTest();
	let calls = 0;
	const orig = globalThis.fetch;
	globalThis.fetch = (async () => {
		calls += 1;
		await new Promise((r) => setTimeout(r, 20));
		return new Response(new Uint8Array([1, 2, 3]), {
			headers: {
				"content-type": "image/jpeg",
				[CARD_STATS_HEADER]: encodeCardStats({
					cache: "miss",
					cacheMs: 5,
					totalMs: 40,
				}),
			},
		});
	}) as typeof fetch;
	try {
		const [a, b] = await Promise.all([
			loadCardBlob("/api/card/b30?_=1"),
			loadCardBlob("/api/card/b30?_=1"),
		]);
		assert.equal(calls, 1);
		assert.equal(a.url, b.url);
		assert.equal(a.stats?.cache, "miss");
		assert.equal(peekCardBlob("/api/card/b30?_=1")?.stats?.cache, "miss");
	} finally {
		globalThis.fetch = orig;
		resetCardFetchCacheForTest();
	}
});

test("loadCardBlob reuses a just-finished blob instead of refetching", async () => {
	resetCardFetchCacheForTest();
	let calls = 0;
	const orig = globalThis.fetch;
	globalThis.fetch = (async () => {
		calls += 1;
		return new Response(new Uint8Array([9]), {
			headers: { "content-type": "image/jpeg" },
		});
	}) as typeof fetch;
	try {
		const first = await loadCardBlob("/api/card/b30?_=2");
		const second = await loadCardBlob("/api/card/b30?_=2");
		assert.equal(calls, 1);
		assert.equal(first.url, second.url);
	} finally {
		globalThis.fetch = orig;
		resetCardFetchCacheForTest();
	}
});

test("private card not_bound retries once then succeeds", async () => {
	resetCardFetchCacheForTest();
	let calls = 0;
	const orig = globalThis.fetch;
	globalThis.fetch = (async () => {
		calls += 1;
		if (calls === 1) {
			return new Response(
				JSON.stringify({ error: "unbound", code: "not_bound" }),
				{
					status: 409,
					headers: { "content-type": "application/json" },
				},
			);
		}
		return new Response(new Uint8Array([9]), {
			headers: { "content-type": "image/jpeg" },
		});
	}) as typeof fetch;
	try {
		const blob = await loadCardBlob("/api/card/b30?_=retry");
		assert.equal(calls, 2);
		assert.ok(blob.url);
	} finally {
		globalThis.fetch = orig;
		resetCardFetchCacheForTest();
	}
});

test("public card not_bound does not retry", async () => {
	resetCardFetchCacheForTest();
	let calls = 0;
	const orig = globalThis.fetch;
	globalThis.fetch = (async () => {
		calls += 1;
		return new Response(
			JSON.stringify({ error: "unbound", code: "not_bound" }),
			{
				status: 409,
				headers: { "content-type": "application/json" },
			},
		);
	}) as typeof fetch;
	try {
		await assert.rejects(
			() => loadCardBlob("/api/public/abc/card/b30?_=retry"),
			(err: unknown) => err instanceof Error && err.name === "http",
		);
		assert.equal(calls, 1);
	} finally {
		globalThis.fetch = orig;
		resetCardFetchCacheForTest();
	}
});

test("clearCardBlobs drops a finished card so the next load refetches", async () => {
	resetCardFetchCacheForTest();
	let calls = 0;
	const orig = globalThis.fetch;
	globalThis.fetch = (async () => {
		calls += 1;
		return new Response(new Uint8Array([9]), {
			headers: { "content-type": "image/jpeg" },
		});
	}) as typeof fetch;
	try {
		await loadCardBlob("/api/card/b30");
		clearCardBlobs();
		await loadCardBlob("/api/card/b30");
		assert.equal(calls, 2);
	} finally {
		globalThis.fetch = orig;
		resetCardFetchCacheForTest();
	}
});

test("card fetches revalidate with the browser cache instead of bypassing it", async () => {
	resetCardFetchCacheForTest();
	const seen: RequestCache[] = [];
	const orig = globalThis.fetch;
	globalThis.fetch = (async (_src: string, init?: RequestInit) => {
		seen.push(init?.cache ?? "default");
		// What the browser hands back after a 304: the stored body, the 304's stats
		return new Response(new Uint8Array([7]), {
			headers: {
				"content-type": "image/jpeg",
				[CARD_STATS_HEADER]: encodeCardStats({
					cache: "hit",
					revalidated: true,
					prepMs: 40,
					cacheMs: 0,
					totalMs: 42,
				}),
			},
		});
	}) as typeof fetch;
	try {
		const blob = await loadCardBlob("/api/card/b30?_=revalidate");
		assert.deepEqual(seen, ["no-cache"]);
		assert.equal(blob.stats?.revalidated, true);
		assert.equal(blob.stats?.prepMs, 40);
		assert.ok((blob.stats?.waitMs ?? -1) >= 0);
	} finally {
		globalThis.fetch = orig;
		resetCardFetchCacheForTest();
	}
});

test("right after a save change cards are fetched with reload, then revalidated again", async () => {
	resetCardFetchCacheForTest();
	const seen: RequestCache[] = [];
	const orig = globalThis.fetch;
	const origNow = Date.now;
	let clock = 90_000_000;
	Date.now = () => clock;
	globalThis.fetch = (async (_src: string, init?: RequestInit) => {
		seen.push(init?.cache ?? "default");
		return new Response(new Uint8Array([1]), {
			headers: { "content-type": "image/jpeg" },
		});
	}) as typeof fetch;
	try {
		clearCardBlobs({ fresh: true });
		await loadCardBlob("/api/card/b30?_=fresh");
		// A cache bypass (plain clear) inside the window does not end it
		clearCardBlobs();
		await loadCardBlob("/api/card/b30?_=fresh");
		clock += 15_001;
		clearCardBlobs();
		await loadCardBlob("/api/card/b30?_=fresh");
		assert.deepEqual(seen, ["reload", "reload", "no-cache"]);
	} finally {
		globalThis.fetch = orig;
		Date.now = origNow;
		resetCardFetchCacheForTest();
	}
});
