import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { localeAlternates } from "@/lib/locale-path";
import { homeMetadata, pageMetadata } from "./og-meta";

afterEach(() => {
	setRequestLocaleForTest();
});

test("a page's canonical is its own language's address and hreflang lists every language", async () => {
	for (const [locale, canonical] of [
		["en", "/privacy"],
		["zh", "/zh/privacy"],
		["ja", "/ja/privacy"],
	] as const) {
		setRequestLocaleForTest(locale);
		const meta = await pageMetadata("privacy", { path: "/privacy" });
		assert.deepEqual(
			meta.alternates,
			{ canonical, languages: localeAlternates("/privacy") },
			locale,
		);
		assert.equal(meta.openGraph?.url, canonical, locale);
	}
});

test("the landing page names / in its own language as canonical", async () => {
	setRequestLocaleForTest("zh");
	const meta = await homeMetadata();
	assert.equal(meta.alternates?.canonical, "/zh");
});

test("a noindex page has robots index false and no alternates", async () => {
	setRequestLocaleForTest("en");
	const meta = await pageMetadata("tags", { noindex: true });
	assert.deepEqual(meta.robots, { index: false });
	assert.equal(meta.alternates, undefined);
});
