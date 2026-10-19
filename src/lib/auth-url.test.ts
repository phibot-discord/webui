import assert from "node:assert/strict";
import test from "node:test";
import {
	configuredAuthOrigins,
	requestHost,
	resetAuthOriginsForTest,
	resolveAuthOrigin,
} from "./auth-url";

function headers(init: Record<string, string>) {
	return new Headers(init);
}

test("requestHost takes the first forwarded host, then host", () => {
	assert.equal(
		requestHost(
			headers({
				"x-forwarded-host": "phi.yuemiyuki.dev, proxy.internal",
				host: "phi-webui.vercel.app",
			}),
		),
		"phi.yuemiyuki.dev",
	);
	assert.equal(requestHost(headers({ host: "phibot.dev" })), "phibot.dev");
	assert.equal(requestHost(headers({})), "");
});

test("resolveAuthOrigin keeps the request host when it is in AUTH_URLS", () => {
	resetAuthOriginsForTest({
		AUTH_URLS: "https://phi.yuemiyuki.dev,https://phi-web.vercel.app",
		AUTH_URL: "https://phi-webui.vercel.app",
	});
	assert.equal(
		resolveAuthOrigin(
			headers({
				host: "phi.yuemiyuki.dev",
				"x-forwarded-proto": "https",
			}),
		),
		"https://phi.yuemiyuki.dev",
	);
	assert.equal(
		resolveAuthOrigin(
			headers({
				"x-forwarded-host": "phi-web.vercel.app",
				"x-forwarded-proto": "https",
			}),
		),
		"https://phi-web.vercel.app",
	);
	assert.deepEqual(configuredAuthOrigins(), [
		"https://phi.yuemiyuki.dev",
		"https://phi-web.vercel.app",
		"https://phi-webui.vercel.app",
	]);
});

test("resolveAuthOrigin includes Vercel production and deployment URLs", () => {
	resetAuthOriginsForTest({
		AUTH_URLS: "",
		AUTH_URL: "",
		VERCEL_PROJECT_PRODUCTION_URL: "phi.yuemiyuki.dev",
		VERCEL_URL: "phi-web-git-main-team.vercel.app",
	});
	assert.equal(
		resolveAuthOrigin(headers({ host: "phi.yuemiyuki.dev" })),
		"https://phi.yuemiyuki.dev",
	);
	assert.equal(
		resolveAuthOrigin(headers({ host: "phi-web-git-main-team.vercel.app" })),
		"https://phi-web-git-main-team.vercel.app",
	);
});
