import assert from "node:assert/strict";
import test from "node:test";
import {
	CARD_STATS_HEADER,
	encodeCardStats,
	parseCardStats,
} from "../lib/card-stats";
import {
	attachmentDisposition,
	cardImageResponse,
	cardRedirectResponse,
	cardResultResponse,
	etagMatches,
	jsonError,
	retryAfter,
	wantsReload,
} from "./http";

test("retryAfter puts remaining seconds in the JSON body and header", async () => {
	const res = retryAfter(37, "wait", "cache_bypass_cooldown");
	assert.equal(res.status, 429);
	assert.equal(res.headers.get("retry-after"), "37");
	assert.equal(res.headers.get("cache-control"), "no-store");
	const body = (await res.json()) as {
		code?: string;
		retryAfter?: number;
	};
	assert.equal(body.code, "cache_bypass_cooldown");
	assert.equal(body.retryAfter, 37);
});

test("jsonError is not stored by caches", async () => {
	const res = jsonError(409, "unbound", "not_bound");
	assert.equal(res.status, 409);
	assert.equal(res.headers.get("cache-control"), "no-store");
	const body = (await res.json()) as { error?: string; code?: string };
	assert.equal(body.code, "not_bound");
});

test("cardImageResponse attaches X-Phi-Stats", () => {
	const stats = {
		cache: "hit" as const,
		store: "r2" as const,
		cacheMs: 12,
		totalMs: 40,
	};
	const res = cardImageResponse(Buffer.from("jpeg"), {
		etag: "abc",
		cacheControl: "private, max-age=60",
		request: new Request("http://localhost/api/card/b30"),
		mime: "image/jpeg",
		stats,
	});
	assert.equal(res.status, 200);
	assert.equal(res.headers.get(CARD_STATS_HEADER), encodeCardStats(stats));
	assert.equal(parseCardStats(res.headers.get(CARD_STATS_HEADER))?.store, "r2");
});

test("cardImageResponse download skips 304 and attaches a filename", () => {
	const res = cardImageResponse(Buffer.from("jpeg"), {
		etag: "abc",
		cacheControl: "private, max-age=60",
		request: new Request("http://localhost/api/card/b30", {
			headers: { "if-none-match": '"abc"' },
		}),
		mime: "image/jpeg",
		filename: "b30.jpg",
	});
	assert.equal(res.status, 200);
	assert.equal(
		res.headers.get("content-disposition"),
		attachmentDisposition("b30.jpg"),
	);
});

test("cardRedirectResponse sends the browser to the cached object", () => {
	const res = cardRedirectResponse(
		"https://r2.example.test/web-cards/b30.jpg",
		{
			etag: "abc",
			cacheControl: "private, max-age=60",
		},
	);
	assert.equal(res.status, 302);
	assert.equal(
		res.headers.get("location"),
		"https://r2.example.test/web-cards/b30.jpg",
	);
});

test("a not-modified card result is a real 304 with the ETag, cache policy and stats", async () => {
	const stats = {
		cache: "hit" as const,
		revalidated: true,
		prepMs: 30,
		cacheMs: 0,
		totalMs: 31,
	};
	const res = cardResultResponse(
		{ bytes: Buffer.alloc(0), etag: "abc", notModified: true, stats },
		{
			cacheControl: "private, no-cache",
			request: new Request("http://localhost/api/card/b30", {
				headers: { "if-none-match": '"abc"' },
			}),
			renderVersion: "v1",
		},
	);
	assert.equal(res.status, 304);
	assert.equal(res.headers.get("etag"), '"abc"');
	assert.equal(res.headers.get("cache-control"), "private, no-cache");
	assert.equal(res.headers.get("x-phi-render"), "v1");
	assert.equal(res.headers.get("content-length"), null);
	assert.equal(parseCardStats(res.headers.get(CARD_STATS_HEADER))?.prepMs, 30);
	assert.equal(await res.text(), "");
});

test("private no-cache cards revalidate; no-store (transient) cards never answer 304", () => {
	const request = new Request("http://localhost/api/card/b30", {
		headers: { "if-none-match": 'W/"abc"' },
	});
	const revalidated = cardImageResponse(Buffer.from("jpeg"), {
		etag: "abc",
		cacheControl: "private, no-cache",
		request,
		mime: "image/jpeg",
	});
	assert.equal(revalidated.status, 304);
	const transient = cardImageResponse(Buffer.from("jpeg"), {
		etag: "abc-p",
		cacheControl: "no-store",
		request: new Request("http://localhost/api/card/b30", {
			headers: { "if-none-match": '"abc-p"' },
		}),
		mime: "image/jpeg",
	});
	assert.equal(transient.status, 200);
	assert.equal(transient.headers.get("cache-control"), "no-store");
	assert.equal(transient.headers.get("content-length"), "4");
});

test("a card that depends on Accept-Language says so on both 200 and 304", () => {
	const opts = {
		cacheControl: "public, s-maxage=300",
		request: new Request("http://localhost/api/public/s/card/b30"),
		vary: "Accept-Language",
	};
	const full = cardResultResponse(
		{ bytes: Buffer.from("jpeg"), etag: "abc", mime: "image/jpeg" },
		opts,
	);
	assert.equal(full.status, 200);
	assert.match(full.headers.get("vary") ?? "", /Accept-Language/);
	const same = cardResultResponse(
		{ bytes: Buffer.alloc(0), etag: "abc", notModified: true },
		opts,
	);
	assert.equal(same.status, 304);
	assert.match(same.headers.get("vary") ?? "", /Accept-Language/);
	const pinned = cardResultResponse(
		{ bytes: Buffer.from("jpeg"), etag: "abc", mime: "image/jpeg" },
		{ ...opts, vary: undefined },
	);
	assert.equal(pinned.headers.get("vary"), null, "?locale pins the language");
});

test("etagMatches takes lists, weak tags and *", () => {
	assert.equal(etagMatches('"abc"', "abc"), true);
	assert.equal(etagMatches('W/"abc"', "abc"), true);
	assert.equal(etagMatches('"old", W/"abc"', "abc"), true);
	assert.equal(etagMatches("*", "abc"), true);
	assert.equal(etagMatches('"abc-p"', "abc"), false);
	assert.equal(etagMatches('"abcd"', "abc"), false);
	assert.equal(etagMatches(null, "abc"), false);
});

test("wantsReload: only an explicit no-cache request, not a revalidation", () => {
	const h = (init: Record<string, string>) => new Headers(init);
	assert.equal(wantsReload(h({ "cache-control": "no-cache" })), true);
	assert.equal(
		wantsReload(h({ "cache-control": "max-age=0, No-Cache" })),
		true,
	);
	assert.equal(wantsReload(h({ pragma: "no-cache" })), true);
	assert.equal(wantsReload(h({ "cache-control": "max-age=0" })), false);
	assert.equal(wantsReload(h({ "cache-control": "no-cache-ish" })), false);
	assert.equal(wantsReload(h({})), false);
});
