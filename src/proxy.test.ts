import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { config } from "./proxy";

const require = createRequire(import.meta.url);
const { pathToRegexp } = require("next/dist/compiled/path-to-regexp") as {
	pathToRegexp: (path: string) => RegExp;
};

const runs = (path: string) =>
	config.matcher.some((m) => pathToRegexp(m).test(path));

test("the proxy runs on pages, Chinese ones included", () => {
	for (const p of ["/", "/songs", "/files", "/zh", "/zh/songs", "/me/b30"]) {
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
