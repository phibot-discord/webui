import assert from "node:assert/strict";
import test from "node:test";
import { servesStaticLanding } from "./static-landing";

const ask = (
	opts: {
		method?: string;
		bare?: string;
		search?: string;
		cookies?: string[];
	} = {},
) =>
	servesStaticLanding({
		method: opts.method ?? "GET",
		bare: opts.bare ?? "/",
		search: new URLSearchParams(opts.search ?? ""),
		cookies: opts.cookies ?? [],
	});

test("a bare landing request without a session is served statically", () => {
	assert.equal(ask(), true);
	assert.equal(ask({ method: "HEAD" }), true);
});

test("other cookies do not count as a session", () => {
	assert.equal(
		ask({
			cookies: [
				"phi-locale",
				"authjs.csrf-token",
				"__Host-authjs.csrf-token",
				"authjs.callback-url",
				"authjs.session-token-old",
			],
		}),
		true,
	);
});

test("any session cookie name keeps the dynamic page", () => {
	for (const name of [
		"authjs.session-token",
		"__Secure-authjs.session-token",
		"__Host-authjs.session-token",
		"authjs.session-token.0",
		"__Secure-authjs.session-token.1",
	]) {
		assert.equal(ask({ cookies: ["phi-locale", name] }), false, name);
	}
});

test("only the router's _rsc parameter is allowed in the query", () => {
	assert.equal(ask({ search: "_rsc=abc" }), true);
	for (const search of [
		"next=/x",
		"asked=1",
		"next=/x&asked=1",
		"_rsc=abc&next=/x",
		"utm_source=x",
	]) {
		assert.equal(ask({ search }), false, search);
	}
});

test("only GET and HEAD are served statically", () => {
	for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
		assert.equal(ask({ method }), false, method);
	}
});

test("pages other than the landing are left alone", () => {
	for (const bare of ["/songs", "/home", "/me", "/files"]) {
		assert.equal(ask({ bare }), false, bare);
	}
});
