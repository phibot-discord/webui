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
				"x-forwarded-host": "pv.phibot.dev, proxy.internal",
				host: "phibot.dev",
			}),
		),
		"pv.phibot.dev",
	);
	assert.equal(requestHost(headers({ host: "phibot.dev" })), "phibot.dev");
	assert.equal(requestHost(headers({})), "");
});

test("resolveAuthOrigin keeps the request host when it is in AUTH_URLS", () => {
	resetAuthOriginsForTest({
		AUTH_URLS: "https://phibot.dev,https://pv.phibot.dev",
		AUTH_URL: "http://localhost:3000",
	});
	assert.equal(
		resolveAuthOrigin(
			headers({
				host: "pv.phibot.dev",
				"x-forwarded-proto": "https",
			}),
		),
		"https://pv.phibot.dev",
	);
	assert.equal(
		resolveAuthOrigin(headers({ host: "localhost:3000" })),
		"http://localhost:3000",
	);
	assert.deepEqual(configuredAuthOrigins(), [
		"https://phibot.dev",
		"https://pv.phibot.dev",
		"http://localhost:3000",
	]);
});

test("resolveAuthOrigin sends unlisted hosts to the first origin", () => {
	const prev = process.env.VERCEL_URL;
	process.env.VERCEL_URL = "phi-webui-git-main-team.vercel.app";
	try {
		resetAuthOriginsForTest({
			AUTH_URLS: "https://phibot.dev,https://pv.phibot.dev",
		});
		assert.equal(
			resolveAuthOrigin(
				headers({ host: "phi-webui-git-main-team.vercel.app" }),
			),
			"https://phibot.dev",
		);
	} finally {
		if (prev === undefined) delete process.env.VERCEL_URL;
		else process.env.VERCEL_URL = prev;
	}
});
