import assert from "node:assert/strict";
import test from "node:test";
import {
	BADGE_STYLES,
	badgeSnippets,
	badgeSvg,
	challengeTier,
	clipName,
	escapeXml,
	parseBadgeStyle,
	textWidth,
} from "./badge";

test("names are escaped, never markup", () => {
	const svg = badgeSvg({ name: `<script>&"x'`, rks: 15.5 });
	assert.ok(!svg.includes("<script>"));
	assert.ok(svg.includes("&lt;script&gt;&amp;&quot;x&apos;"));
	assert.equal(escapeXml("a&b"), "a&amp;b");
});

test("long names are clipped by character, not byte", () => {
	const name = "无限光".repeat(20);
	const clipped = clipName(name);
	assert.equal([...clipped].length, 24);
	assert.ok(clipped.endsWith("…"));
	assert.equal(clipName("   "), "player");
});

test("challenge tier comes from the hundreds digit", () => {
	assert.equal(challengeTier(548), 5);
	assert.equal(challengeTier(312), 3);
	assert.equal(challengeTier(0), 0);
	assert.equal(challengeTier(undefined), 0);
	assert.equal(challengeTier(912), 0);
});

test("the value shows RKS and the challenge level", () => {
	const svg = badgeSvg({ name: "Yue", rks: 15.81234, challenge: 448 });
	assert.ok(svg.includes("RKS 15.8123 · 48"));
	assert.ok(svg.includes('fill="#c99a1e"'));
	assert.ok(badgeSvg({ name: "Yue" }).includes("RKS —"));
	assert.ok(
		badgeSvg({ name: "Yue", challenge: 548 }).includes("url(#rainbow)"),
	);
});

test("CJK is counted wider than Latin", () => {
	assert.ok(textWidth("无限") > textWidth("ab"));
});

test("snippets link the share page", () => {
	const s = badgeSnippets("https://phibot.dev", "abc123DEF456");
	assert.equal(s.image, "https://phibot.dev/api/badge/abc123DEF456");
	assert.equal(
		s.markdown,
		"[![PhiBot RKS](https://phibot.dev/api/badge/abc123DEF456)](https://phibot.dev/p/abc123DEF456)",
	);
});

test("every style escapes the name and names the player for screen readers", () => {
	for (const style of BADGE_STYLES) {
		const svg = badgeSvg({ name: "<b>&x", rks: 16.7, challenge: 351 }, style);
		assert.ok(svg.startsWith("<svg"), style);
		assert.ok(!svg.includes("<b>&x"), style);
		assert.ok(
			svg.includes('aria-label="&lt;b&gt;&amp;x: RKS 16.7000 · 51"'),
			style,
		);
	}
});

test("styles differ where they should", () => {
	const input = { name: "Yue", rks: 15.5, challenge: 448 };
	assert.match(badgeSvg(input, "flat"), /id="gloss"/);
	assert.doesNotMatch(badgeSvg(input, "flat-square"), /id="gloss"/);
	assert.match(badgeSvg(input, "flat-square"), /rx="0"/);
	assert.match(badgeSvg(input, "for-the-badge"), /height="28"/);
	assert.match(badgeSvg(input, "for-the-badge"), />YUE</);
	assert.doesNotMatch(badgeSvg(input, "rks"), />Yue</);
	assert.match(badgeSvg(input, "card"), /fill="#ffffff"/);
	assert.match(badgeSvg(input, "card-dark"), /fill="#16191f"/);
	assert.match(badgeSvg(input, "card"), />48</);
});

test("unknown styles fall back to flat, and snippets carry the style", () => {
	assert.equal(parseBadgeStyle("nope"), "flat");
	assert.equal(parseBadgeStyle(null), "flat");
	assert.equal(parseBadgeStyle("card-dark"), "card-dark");
	assert.equal(
		badgeSnippets("https://phibot.dev", "abc123DEF456", "card").image,
		"https://phibot.dev/api/badge/abc123DEF456?style=card",
	);
});
