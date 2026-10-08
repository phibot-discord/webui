import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import nextConfig from "../../next.config";

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
