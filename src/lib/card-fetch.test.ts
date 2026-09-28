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
