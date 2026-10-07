import assert from "node:assert/strict";
import test from "node:test";
import { cookieLocale, localeSetCookie } from "./server";

test("cookieLocale reads phi-locale from a raw Cookie header", () => {
	const h = (cookie?: string) => new Headers(cookie == null ? {} : { cookie });
	assert.equal(cookieLocale(h("a=1; phi-locale=zh; b=2")), "zh");
	assert.equal(cookieLocale(h("phi-locale=en")), "en");
	assert.equal(cookieLocale(h("phi-locale=fr")), undefined);
	assert.equal(cookieLocale(h("xphi-locale=zh")), undefined);
	assert.equal(cookieLocale(h()), undefined);
});

test("localeSetCookie matches what the page side reads back", () => {
	const value = localeSetCookie("zh");
	assert.match(value, /^phi-locale=zh;/);
	assert.match(value, /Path=\//);
	assert.match(value, /Max-Age=31536000/);
	assert.equal(
		cookieLocale(new Headers({ cookie: value.split(";")[0] ?? "" })),
		"zh",
	);
});
