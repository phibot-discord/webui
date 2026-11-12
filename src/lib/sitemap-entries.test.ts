import assert from "node:assert/strict";
import test from "node:test";
import { SITEMAP_PAGES, sitemapEntries } from "./sitemap-entries";

test("the sitemap lists these pages", () => {
	assert.deepEqual(SITEMAP_PAGES, [
		"/",
		"/songs",
		"/charts",
		"/score",
		"/phira",
		"/guess",
		"/timing",
		"/tiers",
		"/versions",
		"/status",
		"/privacy",
		"/tos",
	]);
});

test("each page appears once per language with every language as an alternate", () => {
	const languages = {
		en: "https://phibot.dev/privacy",
		zh: "https://phibot.dev/zh/privacy",
		ja: "https://phibot.dev/ja/privacy",
		"x-default": "https://phibot.dev/privacy",
	};
	assert.deepEqual(sitemapEntries(["/privacy"]), [
		{ url: "https://phibot.dev/privacy", alternates: { languages } },
		{ url: "https://phibot.dev/zh/privacy", alternates: { languages } },
		{ url: "https://phibot.dev/ja/privacy", alternates: { languages } },
	]);
});

test("an ampersand is escaped", () => {
	const [entry] = sitemapEntries(["/files?view=collection&chapter=c2"]);
	assert.equal(
		entry?.url,
		"https://phibot.dev/files?view=collection&amp;chapter=c2",
	);
	assert.equal(
		entry?.alternates?.languages?.zh,
		"https://phibot.dev/zh/files?view=collection&amp;chapter=c2",
	);
});
