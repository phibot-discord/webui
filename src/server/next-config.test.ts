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
		"/api/songs/search",
		"/api/charts",
		"/api/manual",
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
