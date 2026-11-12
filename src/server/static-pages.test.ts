import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(process.cwd(), "src/app/[locale]");

function source(path: string): string {
	return readFileSync(join(ROOT, path), "utf8");
}

test("the static legal pages refuse request data", () => {
	for (const page of ["privacy/page.tsx", "tos/page.tsx"]) {
		assert.ok(
			source(page).includes('export const dynamic = "error";'),
			`${page} must export dynamic = "error"`,
		);
	}
});

test("the root layout lists every locale and reads no request data", () => {
	const layout = source("layout.tsx");
	assert.ok(layout.includes("generateStaticParams"));
	assert.ok(layout.includes("LOCALES.map"));
	for (const read of ["cookies(", "headers(", "auth(", "searchParams"]) {
		assert.ok(!layout.includes(read), `layout.tsx must not use ${read}`);
	}
});

test("the home page is static and leaves the session to the browser", () => {
	const page = source("home/page.tsx");
	assert.ok(page.includes('export const dynamic = "error";'));
	assert.ok(page.includes(" live />"));
	assert.ok(!page.includes("auth("), "home/page.tsx must not call auth()");
});

test("the status page is regenerated every minute from a source the framework does not cache", () => {
	const page = source("status/page.tsx");
	assert.ok(page.includes('export const dynamic = "error";'));
	assert.ok(page.includes("export const revalidate = 60;"));
	assert.ok(page.includes("refreshMs={revalidate * 1000}"));
	assert.ok(page.includes("if (!isLocale(locale)) notFound();"));
	const data = source("../../server/status.ts");
	assert.ok(data.includes("fetchImpl: StatusFetch = outgoingFetch,"));
	assert.ok(
		!data.includes("cache:"),
		"status.ts must not pass fetch cache options",
	);
});
