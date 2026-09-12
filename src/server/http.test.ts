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
	retryAfter,
} from "./http";

test("retryAfter puts remaining seconds in the JSON body and header", async () => {
	const res = retryAfter(37, "wait", "cache_bypass_cooldown");
	assert.equal(res.status, 429);
	assert.equal(res.headers.get("retry-after"), "37");
	const body = (await res.json()) as {
		code?: string;
		retryAfter?: number;
	};
	assert.equal(body.code, "cache_bypass_cooldown");
	assert.equal(body.retryAfter, 37);
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
