import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import nextConfig, { commitSha } from "../../next.config";

const require = createRequire(import.meta.url);
const picomatch = require("next/dist/compiled/picomatch") as (
	glob: string,
	opts: { dot: boolean; contains: boolean },
) => (route: string) => boolean;

/** Matched the way Next's tracer does */
function includesFor(name: string): string[] {
	const includes = nextConfig.outputFileTracingIncludes ?? {};
	return Object.keys(includes)
		.filter((key) => picomatch(key, { dot: true, contains: true })(name))
		.flatMap((key) => includes[key] ?? []);
}

test("routes that load the song catalog ship phi-assets/info", () => {
	for (const route of [
		"/api/charts",
		"/api/manual",
		"/api/sim",
		"/api/refresh",
		"/api/login/taptap/poll",
	]) {
		// webpack names the route, Turbopack the route file
		for (const name of [route, `${route}/route`]) {
			assert.ok(
				includesFor(name).includes("./phi-assets/info/**/*"),
				`${name} has no phi-assets/info include`,
			);
		}
	}
});

test("every page gets the hardening headers and badges keep their own policy", async () => {
	const rules = await nextConfig.headers?.();
	assert.ok(rules);
	assert.equal(rules.length, 2);
	const all = rules.find((rule) => rule.source === "/:path*");
	assert.ok(all);
	assert.equal(
		all.headers.find((h) => h.key === "X-Content-Type-Options")?.value,
		"nosniff",
	);
	assert.equal(
		all.headers.find((h) => h.key === "Referrer-Policy")?.value,
		"strict-origin-when-cross-origin",
	);
	const framing = rules.find((rule) => rule !== all);
	assert.ok(framing);
	assert.ok(framing.source.includes("api/badge"));
	assert.ok(
		framing.headers.some(
			(h) =>
				h.key === "Content-Security-Policy" &&
				h.value === "frame-ancestors 'self'",
		),
	);
});

test("the footer commit is Vercel's when it sets one, else git's HEAD", () => {
	const prev = process.env.VERCEL_GIT_COMMIT_SHA;
	try {
		process.env.VERCEL_GIT_COMMIT_SHA = "  abc1234def  ";
		assert.equal(commitSha(), "abc1234def");
		delete process.env.VERCEL_GIT_COMMIT_SHA;
		assert.match(commitSha(), /^(?:[0-9a-f]{40})?$/);
	} finally {
		if (prev === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
		else process.env.VERCEL_GIT_COMMIT_SHA = prev;
	}
	assert.equal(nextConfig.env?.NEXT_PUBLIC_COMMIT_SHA, commitSha());
});
