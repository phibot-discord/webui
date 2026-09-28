import assert from "node:assert/strict";
import test from "node:test";
import {
	cardDownloadFilename,
	cardEtag,
	cardFilenameFromCacheKey,
} from "./cache";
import {
	type CardImageCacheInput,
	cardCacheParts,
	parseCachedHeight,
} from "./card-image-cache";
import { publicObjectUrl } from "./r2";

function sample(over: Partial<CardImageCacheInput> = {}): CardImageCacheInput {
	return {
		kind: "b30",
		userId: "user",
		saveRevision: "save-a",
		locale: "locale:zh",
		quality: "fast",
		epoch: "0",
		count: "33",
		theme: "default",
		analysisFlag: "a1",
		tagFlag: "t1",
		avgFlag: "avg:all:blue",
		renderVersion: "v32",
		...over,
	};
}

test("same save + language + quality + bust epoch reuse the JPEG cache id", () => {
	const a = cardEtag(cardCacheParts(sample(), "jpeg"));
	const b = cardEtag(cardCacheParts(sample(), "jpeg"));
	assert.equal(a, b);
});

test("save, language, quality, or cache bypass each get a new JPEG cache id", () => {
	const base = cardEtag(cardCacheParts(sample(), "jpeg"));
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ saveRevision: "save-b" }), "jpeg")),
	);
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ locale: "locale:en" }), "jpeg")),
	);
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ quality: "high" }), "jpeg")),
	);
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ epoch: "123" }), "jpeg")),
	);
});

test("same save + language + quality reuse the height cache id", () => {
	const a = cardEtag(cardCacheParts(sample(), "height"));
	const b = cardEtag(cardCacheParts(sample(), "height"));
	assert.equal(a, b);
	assert.notEqual(a, cardEtag(cardCacheParts(sample(), "jpeg")));
});

test("save, language, or quality each get a new height cache id", () => {
	const base = cardEtag(cardCacheParts(sample(), "height"));
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ saveRevision: "save-b" }), "height")),
	);
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ locale: "locale:en" }), "height")),
	);
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ quality: "high" }), "height")),
	);
});

test("cache bypass keeps the height id when save language and quality stay", () => {
	assert.equal(
		cardEtag(cardCacheParts(sample(), "height")),
		cardEtag(cardCacheParts(sample({ epoch: "123" }), "height")),
	);
});

test("enabling tags after a t0 render must not reuse the t0 etag", () => {
	const off = cardEtag(cardCacheParts(sample({ tagFlag: "t0" }), "jpeg"));
	const on = cardEtag(cardCacheParts(sample({ tagFlag: "t1" }), "jpeg"));
	assert.notEqual(on, off);
});

test("theme or analysis changes get a new JPEG cache id", () => {
	const base = cardEtag(cardCacheParts(sample(), "jpeg"));
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ theme: "dark" }), "jpeg")),
	);
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ analysisFlag: "a0" }), "jpeg")),
	);
});

test("b30 avg bar setting changes get a new JPEG cache id", () => {
	const base = cardEtag(cardCacheParts(sample(), "jpeg"));
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ avgFlag: "avg:none" }), "jpeg")),
	);
	assert.notEqual(
		base,
		cardEtag(cardCacheParts(sample({ avgFlag: "avg:b30:red" }), "jpeg")),
	);
});

test("parseCachedHeight keeps measured pixel heights", () => {
	assert.equal(parseCachedHeight(4320), 4320);
	assert.equal(parseCachedHeight("4320"), 4320);
	assert.equal(parseCachedHeight(64), undefined);
	assert.equal(parseCachedHeight("nope"), undefined);
});

test("download filename comes from the card kind in the cache key", () => {
	assert.equal(cardDownloadFilename("b30"), "b30.jpg");
	assert.equal(
		cardFilenameFromCacheKey("phi:webCard:png:x30:user:abcdef"),
		"x30.jpg",
	);
});

test("public object URL is the R2 custom domain plus key", () => {
	assert.equal(
		publicObjectUrl("web-cards/phi:webCard:png:b30:u:etag.jpg", {
			accountId: "a",
			apiToken: "t",
			bucket: "phi-web-assets",
			prefix: "original_ill",
			htmlPrefix: "html",
			publicBase: "https://r2.example.test",
		}),
		"https://r2.example.test/web-cards/phi%3AwebCard%3Apng%3Ab30%3Au%3Aetag.jpg",
	);
});
