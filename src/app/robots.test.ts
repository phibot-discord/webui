import assert from "node:assert/strict";
import test from "node:test";
import robots from "./robots";

test("robots keeps crawlers out of the API, renders and private pages but not the OG images", () => {
	assert.deepEqual(robots(), {
		rules: {
			userAgent: "*",
			allow: ["/", "/api/og/", "/api/assets"],
			disallow: ["/api/", "/render/", "/me", "/account"],
		},
		sitemap: "https://phibot.dev/sitemap.xml",
	});
});
