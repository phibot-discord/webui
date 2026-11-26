import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
	BOX_TOKENS,
	ERROR_PAGES,
	ERROR_PAGES_DIR,
	FACT_TOKENS,
	readErrorPageAssets,
	renderErrorPage,
} from "./cf-error-pages";

const REQUIRED: Record<string, string | null> = {
	"WAF block": null,
	"IP/Country block": null,
	"IP/Country challenge": "::CAPTCHA_BOX::",
	"500 class errors": "::CLOUDFLARE_ERROR_500S_BOX::",
	"1000 class errors": "::CLOUDFLARE_ERROR_1000S_BOX::",
	"Interactive challenge": "::CAPTCHA_BOX::",
	"Managed challenge / I'm Under Attack Mode": "::CAPTCHA_BOX::",
	"Non-interactive challenge": "::IM_UNDER_ATTACK_BOX::",
	"Rate limiting block": null,
};

const assets = readErrorPageAssets();

function count(haystack: string, needle: string): number {
	return haystack.split(needle).length - 1;
}

test("one page per Cloudflare error page type", () => {
	assert.deepEqual(
		ERROR_PAGES.map((p) => p.type).sort(),
		Object.keys(REQUIRED).sort(),
	);
	assert.equal(
		new Set(ERROR_PAGES.map((p) => p.file)).size,
		ERROR_PAGES.length,
	);
});

for (const page of ERROR_PAGES) {
	test(`${page.type} meets Cloudflare's template rules`, () => {
		const html = renderErrorPage(page, assets);
		const required = REQUIRED[page.type];
		for (const token of Object.values(BOX_TOKENS)) {
			assert.equal(count(html, token), token === required ? 1 : 0, token);
		}
		for (const fact of page.facts) {
			assert.equal(count(html, FACT_TOKENS[fact]), 1, FACT_TOKENS[fact]);
		}
		assert.equal(count(html, "<head>"), 1);
		assert.equal(count(html, "</head>"), 1);
		assert.ok(!/<meta[^>]+name="referrer"/i.test(html));
		assert.ok(!html.includes("_cf_chl_opt"));
		assert.ok(
			!/<(link|script|img)[^>]+(src|href)="(?!data:|https:\/\/phibot\.dev\/)/.test(
				html,
			),
		);
		assert.ok(Buffer.byteLength(html) < 1_500_000);
	});

	test(`${page.file} in public is up to date`, () => {
		const saved = readFileSync(join(ERROR_PAGES_DIR, page.file), "utf8");
		assert.equal(
			saved,
			renderErrorPage(page, assets),
			"run pnpm cf-errors to rewrite public/cf-errors",
		);
	});
}
