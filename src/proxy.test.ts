import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

const require = createRequire(import.meta.url);
const { pathToRegexp } = require("next/dist/compiled/path-to-regexp") as {
	pathToRegexp: (path: string) => RegExp;
};
const { getRedirectUrl, getRewrittenUrl, isRewrite } =
	require("next/experimental/testing/server") as {
		getRedirectUrl: (res: Response) => string | null;
		getRewrittenUrl: (res: Response) => string | null;
		isRewrite: (res: Response) => boolean;
	};

const runs = (path: string) =>
	config.matcher.some((m) => pathToRegexp(m).test(path));

const send = (
	path: string,
	method = "GET",
	headers: Record<string, string> = {},
) =>
	proxy(
		new NextRequest(new URL(path, "https://phibot.dev"), { method, headers }),
	);

const target = (url: string | null) => {
	assert.ok(url, "no target URL");
	const { pathname, search } = new URL(url);
	return pathname + search;
};

test("the proxy runs on pages, Chinese ones included", () => {
	for (const p of [
		"/",
		"/songs",
		"/files",
		"/zh",
		"/zh/songs",
		"/me/b30",
		"/en/songs",
	]) {
		assert.equal(runs(p), true, p);
	}
});

test("the proxy skips API routes, renders, build output and files", () => {
	for (const p of [
		"/api",
		"/api/og/home",
		"/render/deduction",
		"/_next/static/chunks/a.js",
		"/robots.txt",
		"/sitemap.xml",
		"/manifest.webmanifest",
		"/icon.svg",
		"/landing/b30-sample-480.webp",
	]) {
		assert.equal(runs(p), false, p);
	}
});

test("a bare page is served from the English segment", async () => {
	for (const [path, want] of [
		["/songs", "/en/songs"],
		["/", "/en"],
		["/files?view=timeline", "/en/files?view=timeline"],
	] as const) {
		const res = await send(path);
		assert.equal(isRewrite(res), true, path);
		assert.equal(target(getRewrittenUrl(res)), want, path);
	}
});

test("a Chinese or Japanese page is neither rewritten nor redirected", async () => {
	for (const path of ["/zh/songs", "/ja"]) {
		const res = await send(path);
		assert.equal(isRewrite(res), false, path);
		assert.equal(getRedirectUrl(res), null, path);
	}
});

test("an address that starts with the English segment redirects to the bare address", async () => {
	for (const [path, want] of [
		["/en/songs", "/songs"],
		["/en", "/"],
		["/en?next=%2Fme", "/?next=%2Fme"],
	] as const) {
		const res = await send(path);
		assert.equal(res.status, 308, path);
		assert.equal(target(getRedirectUrl(res)), want, path);
	}
});

test("visitors who prefer Chinese or Japanese are still sent to their prefix", async () => {
	const zh = await send("/songs", "GET", { cookie: "phi-locale=zh" });
	assert.equal(target(getRedirectUrl(zh)), "/zh/songs");
	const ja = await send("/songs", "GET", { "accept-language": "ja" });
	assert.equal(target(getRedirectUrl(ja)), "/ja/songs");
});

test("a POST to a bare page is rewritten, not redirected", async () => {
	const res = await send("/songs", "POST", { cookie: "phi-locale=zh" });
	assert.equal(getRedirectUrl(res), null);
	assert.equal(isRewrite(res), true);
	assert.equal(target(getRewrittenUrl(res)), "/en/songs");
});
