import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import test from "node:test";
import nextConfig, { nonCardRoutes, renderFonts } from "../../../next.config";

const require = createRequire(import.meta.url);
const picomatch = require("next/dist/compiled/picomatch") as (
	glob: string,
	opts: { dot: boolean; contains: boolean },
) => (route: string) => boolean;

const APP = join(process.cwd(), "src/app");
const CARD_ROUTES = ["/api/card/[kind]", "/api/public/[slug]/card/[kind]"];

function appRoutes() {
	const out: { route: string; turbopack: string }[] = [];
	const walk = (dir: string) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, e.name);
			if (e.isDirectory()) walk(path);
			else if (/^(route\.ts|page\.tsx)$/.test(e.name)) {
				const segments = relative(APP, dir)
					.split(sep)
					.filter((s) => s && !/^\(.*\)$/.test(s));
				const route = `/${segments.join("/")}`;
				const leaf = e.name.startsWith("route") ? "route" : "page";
				out.push({
					route,
					turbopack: `${route === "/" ? "" : route}/${leaf}`,
				});
			}
		}
	};
	walk(APP);
	return out;
}

/** Same matching as Next's tracer */
function keysMatching(keys: string[], name: string) {
	return keys.filter((key) =>
		picomatch(key, { dot: true, contains: true })(name),
	);
}

const excludes = nextConfig.outputFileTracingExcludes ?? {};
const includes = nextConfig.outputFileTracingIncludes ?? {};
const fontExcludeKeys = Object.keys(excludes).filter((key) =>
	excludes[key]?.some(
		(p) =>
			/common\/font/.test(p) || /src\/fonts\/(\*|noto-sans-sc-400)/.test(p),
	),
);

test("the card routes are found and keep their fonts", () => {
	const routes = appRoutes();
	for (const card of CARD_ROUTES) {
		const found = routes.find((r) => r.route === card);
		assert.ok(found, `${card} missing under src/app`);
		for (const name of [found.route, found.turbopack]) {
			assert.deepEqual(keysMatching(fontExcludeKeys, name), [], name);
			const included = keysMatching(Object.keys(includes), name).flatMap(
				(key) => includes[key] ?? [],
			);
			assert.ok(
				included.some((p) => p.startsWith("./phi-assets/html/")),
				`${name} gets no phi-assets/html include`,
			);
		}
	}
});

test("every other route drops the render fonts", () => {
	assert.deepEqual(new Set(fontExcludeKeys), new Set(nonCardRoutes));
	// "/" is skipped: the landing page gets no fonts anyway, and a "/" key would match every route
	const missing = appRoutes()
		.filter((r) => !CARD_ROUTES.includes(r.route) && r.route !== "/")
		.filter((r) => !keysMatching(nonCardRoutes, r.turbopack).length)
		.map((r) => r.route);
	assert.deepEqual(
		missing,
		[],
		"add these routes to nonCardRoutes in next.config.ts",
	);
	assert.deepEqual(renderFonts, [
		"phi-assets/html/common/font/**",
		"src/fonts/**",
	]);
});

test("every trace pattern names a path, not a bare file name", () => {
	// Under Turbopack a pattern without "/" matches that name at any depth
	for (const patterns of [
		...Object.values(excludes),
		...Object.values(includes),
	])
		for (const p of patterns ?? [])
			assert.match(p.replace(/^\.\//, ""), /\//, p);
});
