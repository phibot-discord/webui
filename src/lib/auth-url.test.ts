import assert from "node:assert/strict";
import test from "node:test";
import {
	configuredAuthOrigins,
	requestHost,
	resetAuthOriginsForTest,
	resolveAuthOrigin,
	stripCanonicalAuthUrlIfMany,
	withBoundAuthUrl,
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

const atX = () => headers({ host: "phibot.dev", "x-forwarded-proto": "https" });
const atY = () =>
	headers({ host: "pv.phibot.dev", "x-forwarded-proto": "https" });
const tick = () => new Promise((resolve) => setImmediate(resolve));

function severalOrigins() {
	resetAuthOriginsForTest({
		AUTH_URLS: "https://phibot.dev,https://pv.phibot.dev",
		AUTH_URL: "http://localhost:3000",
	});
	stripCanonicalAuthUrlIfMany();
}

test("overlapping sign-ins that end in start order leave AUTH_URL unset", async () => {
	severalOrigins();
	const a = Promise.withResolvers<void>();
	const b = Promise.withResolvers<void>();
	const first = withBoundAuthUrl(atX(), () => a.promise);
	const second = withBoundAuthUrl(atY(), () => b.promise);
	await tick();
	a.resolve();
	await first;
	b.resolve();
	await second;
	assert.equal(process.env.AUTH_URL, undefined);
});

test("each of two overlapping calls sees its own origin while it runs", async () => {
	severalOrigins();
	const a = Promise.withResolvers<void>();
	const seen: string[] = [];
	const first = withBoundAuthUrl(atX(), async () => {
		await a.promise;
		seen.push(`a:${process.env.AUTH_URL}`);
	});
	const second = withBoundAuthUrl(atY(), () => {
		seen.push(`b:${process.env.AUTH_URL}`);
	});
	await tick();
	a.resolve();
	await Promise.all([first, second]);
	assert.deepEqual(seen, ["a:https://phibot.dev", "b:https://pv.phibot.dev"]);
	assert.equal(process.env.AUTH_URL, undefined);
});

test("a call that throws still restores AUTH_URL and lets the next one run", async () => {
	severalOrigins();
	await assert.rejects(
		withBoundAuthUrl(atX(), () => {
			throw new Error("NEXT_REDIRECT");
		}),
		/NEXT_REDIRECT/,
	);
	assert.equal(process.env.AUTH_URL, undefined);
	assert.equal(
		await withBoundAuthUrl(atY(), () => process.env.AUTH_URL),
		"https://pv.phibot.dev",
	);
});

test("a call that never finishes holds the next one back only for the wait bound", async () => {
	severalOrigins();
	const hung = Promise.withResolvers<void>();
	const first = withBoundAuthUrl(atX(), () => hung.promise);
	const startedAt = Date.now();
	assert.equal(
		await withBoundAuthUrl(atY(), () => process.env.AUTH_URL, 100),
		"https://pv.phibot.dev",
	);
	assert.ok(Date.now() - startedAt >= 50);
	hung.resolve();
	await first;
	assert.equal(process.env.AUTH_URL, undefined);
});

test("the value put back is the one the strip left at load time", async () => {
	resetAuthOriginsForTest({ AUTH_URL: "https://phibot.dev" });
	stripCanonicalAuthUrlIfMany();
	process.env.AUTH_URL = "https://stale.example";
	await withBoundAuthUrl(atX(), () => undefined);
	assert.equal(process.env.AUTH_URL, "https://phibot.dev");
});
