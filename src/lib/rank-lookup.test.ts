import assert from "node:assert/strict";
import test from "node:test";
import { fetchRank, rankUrl } from "./rank-lookup";

async function withFetch<T>(stub: typeof fetch, run: () => Promise<T>) {
	const orig = globalThis.fetch;
	globalThis.fetch = stub;
	try {
		return await run();
	} finally {
		globalThis.fetch = orig;
	}
}

function answering(body: unknown, status = 200): typeof fetch {
	return (async () =>
		new Response(typeof body === "string" ? body : JSON.stringify(body), {
			status,
		})) as typeof fetch;
}

test("the request names the chart, the level and the accuracy with six decimals", () => {
	assert.equal(
		rankUrl("Glaciaxion.SunsetRay.0", "IN", 98.5),
		"/api/leaderboard?chart=Glaciaxion.SunsetRay.0&level=IN&acc=98.500000",
	);
});

test("the request goes to the given address with the caller's signal", async () => {
	let seen: { url: string; init?: RequestInit } | undefined;
	const stub = (async (url: string | URL | Request, init?: RequestInit) => {
		seen = { url: String(url), init };
		return new Response("{}", { status: 404 });
	}) as typeof fetch;
	const ac = new AbortController();
	await withFetch(stub, () => fetchRank("/api/leaderboard?x=1", ac.signal));
	assert.equal(seen?.url, "/api/leaderboard?x=1");
	assert.equal(seen?.init?.signal, ac.signal);
});

test("a full answer is ranked", async () => {
	const got = await withFetch(
		answering({
			rank: 12,
			of: 3400,
			percent: 0.35,
			tied: 2,
			source: "phib19.top",
		}),
		() => fetchRank("/api/leaderboard"),
	);
	assert.deepEqual(got, {
		kind: "ranked",
		rank: 12,
		of: 3400,
		percent: 0.35,
		tied: 2,
	});
});

test("an answer without percent or tied is ranked with percent null and tied 0", async () => {
	const got = await withFetch(answering({ rank: 1, of: 9 }), () =>
		fetchRank("/api/leaderboard"),
	);
	assert.deepEqual(got, {
		kind: "ranked",
		rank: 1,
		of: 9,
		percent: null,
		tied: 0,
	});
});

test("a 404 means the chart has no records", async () => {
	const got = await withFetch(answering({ error: "no_data" }, 404), () =>
		fetchRank("/api/leaderboard"),
	);
	assert.deepEqual(got, { kind: "none" });
});

test("any other failed status is unavailable", async () => {
	for (const status of [400, 429, 503]) {
		const got = await withFetch(answering({ error: "x" }, status), () =>
			fetchRank("/api/leaderboard"),
		);
		assert.deepEqual(got, { kind: "unavailable" }, String(status));
	}
});

test("an answer without numeric rank and of is unavailable", async () => {
	const bodies: unknown[] = [{ rank: "12", of: 3400 }, null, "not json"];
	for (const body of bodies) {
		const got = await withFetch(answering(body), () =>
			fetchRank("/api/leaderboard"),
		);
		assert.deepEqual(got, { kind: "unavailable" }, String(body));
	}
});

test("a network error or an abort resolves as unavailable instead of rejecting", async () => {
	const failures = [
		new TypeError("fetch failed"),
		new DOMException("aborted", "AbortError"),
	];
	for (const failure of failures) {
		const stub = (async () => {
			throw failure;
		}) as typeof fetch;
		const got = await withFetch(stub, () => fetchRank("/api/leaderboard"));
		assert.deepEqual(got, { kind: "unavailable" }, failure.name);
	}
});
