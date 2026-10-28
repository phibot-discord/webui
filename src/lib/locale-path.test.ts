import assert from "node:assert/strict";
import test from "node:test";
import {
	localeAlternates,
	localePath,
	pathLocale,
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
		"x-default": "/songs",
	});
	assert.deepEqual(localeAlternates("/"), {
		en: "/",
		zh: "/zh",
		"x-default": "/",
	});
});
