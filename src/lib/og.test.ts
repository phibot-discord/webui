import assert from "node:assert/strict";
import test from "node:test";
import { ogPageHtml } from "@/server/render/og-page";
import { isOgPage, OG_VERSION, ogPageUrl, ogShareUrl } from "./og";

test("og ids and URLs", () => {
	assert.ok(isOgPage("songs"));
	assert.ok(!isOgPage("render"));
	assert.equal(ogPageUrl("pv", "zh"), `/api/og/pv?lang=zh&v=${OG_VERSION}`);
	assert.equal(
		ogShareUrl("a b", "b30", "en"),
		`/api/og/share/a%20b/b30?lang=en&v=${OG_VERSION}`,
	);
});

test("the title card escapes its text and clips a long lede", () => {
	const html = ogPageHtml({
		brand: "PhiBot",
		title: "<Song> & co",
		lede: "word ".repeat(200),
		host: "example.test",
		accent: "#fff",
		tiles: ["/tmp/a.png"],
	});
	assert.match(html, /&lt;Song&gt; &amp; co/);
	assert.doesNotMatch(html, /<Song>/);
	assert.match(html, /…<\/div>/);
	assert.doesNotMatch(html, /class="og-bg"/);
});
