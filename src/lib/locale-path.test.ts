import assert from "node:assert/strict";
import test from "node:test";
import {
	isEnglishSegment,
	localeAlternates,
	localePath,
	pathLocale,
	segmentPath,
	stripLocale,
} from "./locale-path";

test("only /zh and /zh/… are Chinese", () => {
	for (const p of ["/zh", "/zh/", "/zh/songs", "/zh?next=%2Fme", "/zh#top"]) {
		assert.equal(pathLocale(p), "zh", p);
	}
	for (const p of ["/", "/zhx", "/songs/zh", "/files?view=zh"]) {
		assert.equal(pathLocale(p), "en", p);
	}
});

test("stripLocale drops the prefix and keeps the query", () => {
	assert.equal(stripLocale("/zh"), "/");
	assert.equal(stripLocale("/zh/songs"), "/songs");
	assert.equal(stripLocale("/zh?next=%2Fme"), "/?next=%2Fme");
	assert.equal(stripLocale("/zhx"), "/zhx");
	assert.equal(stripLocale("/songs"), "/songs");
});

test("localePath prefixes pages in Chinese and leaves English bare", () => {
	assert.equal(localePath("/", "zh"), "/zh");
	assert.equal(localePath("/?next=/me", "zh"), "/zh?next=/me");
	assert.equal(localePath("/#x", "zh"), "/zh#x");
	assert.equal(
		localePath("/files?view=collection&chapter=c2", "zh"),
		"/zh/files?view=collection&chapter=c2",
	);
	assert.equal(localePath("/zh/songs", "zh"), "/zh/songs");
	assert.equal(localePath("/zh/songs", "en"), "/songs");
	assert.equal(localePath("/songs", "en"), "/songs");
	assert.equal(localePath("/zhx", "zh"), "/zh/zhx");
});

test("localePath leaves external links, API routes and files alone", () => {
	for (const p of [
		"//evil.example/x",
		"https://github.com/phibot-discord/webui",
		"/api/og/home?lang=zh",
		"/api",
		"/render/deduction",
		"/_next/static/a.js",
		"/landing/b30-sample-full.webp",
		"/og/fallback.jpg?v=2",
		"#top",
	]) {
		assert.equal(localePath(p, "zh"), p, p);
	}
});

test("every locale's URL plus x-default", () => {
	assert.deepEqual(localeAlternates("/songs"), {
		en: "/songs",
		zh: "/zh/songs",
		ja: "/ja/songs",
		"x-default": "/songs",
	});
	assert.deepEqual(localeAlternates("/"), {
		en: "/",
		zh: "/zh",
		ja: "/ja",
		"x-default": "/",
	});
});

test("/ja pages are Japanese and switch prefixes cleanly", () => {
	assert.equal(pathLocale("/ja"), "ja");
	assert.equal(pathLocale("/ja/songs?q=1"), "ja");
	assert.equal(pathLocale("/jax"), "en");
	assert.equal(stripLocale("/ja/songs"), "/songs");
	assert.equal(stripLocale("/ja?next=%2Fme"), "/?next=%2Fme");
	assert.equal(localePath("/zh/songs", "ja"), "/ja/songs");
	assert.equal(localePath("/ja/songs", "zh"), "/zh/songs");
	assert.equal(localePath("/ja/songs", "en"), "/songs");
	assert.equal(localePath("/", "ja"), "/ja");
	assert.equal(
		localePath("/api/og/home?lang=ja", "ja"),
		"/api/og/home?lang=ja",
	);
});

test("the internal English segment is stripped like the others", () => {
	assert.equal(stripLocale("/en/songs"), "/songs");
	assert.equal(stripLocale("/en"), "/");
	assert.equal(stripLocale("/enx"), "/enx");
	assert.equal(pathLocale("/en/songs"), "en");
	assert.equal(localePath("/en/songs", "zh"), "/zh/songs");
	assert.equal(localePath("/en/songs", "en"), "/songs");
});

test("only /en and /en/… are the English segment", () => {
	for (const p of ["/en", "/en/", "/en/songs", "/en?x=1"]) {
		assert.equal(isEnglishSegment(p), true, p);
	}
	for (const p of ["/", "/enx", "/zh/en", "/songs/en"]) {
		assert.equal(isEnglishSegment(p), false, p);
	}
});

test("segmentPath puts a page under its locale folder", () => {
	assert.equal(segmentPath("/songs", "en"), "/en/songs");
	assert.equal(segmentPath("/", "en"), "/en");
	assert.equal(segmentPath("/zh/songs", "zh"), "/zh/songs");
	assert.equal(segmentPath("/zh/songs", "en"), "/en/songs");
});
