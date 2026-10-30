import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(process.cwd(), "src/components");
const BARE_URL =
	/(history\.(?:replaceState|pushState)\(\s*null,\s*"",\s*|router\.(?:push|replace)\(\s*)(["'`]\/|[A-Za-z]+Href\()/;

function files(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory()
			? files(join(dir, e.name))
			: e.name.endsWith(".tsx")
				? [join(dir, e.name)]
				: [],
	);
}

test("client code never writes an address without its language prefix", () => {
	const hits: string[] = [];
	for (const file of files(ROOT)) {
		readFileSync(file, "utf8")
			.split("\n")
			.forEach((line, i) => {
				if (BARE_URL.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
			});
	}
	assert.deepEqual(
		hits,
		[],
		"wrap the path in localePath(), or /zh pages switch to English",
	);
});

test("the check catches the bugs it was written for", () => {
	assert.ok(
		BARE_URL.test('window.history.replaceState(null, "", songsHref(q));'),
	);
	assert.ok(BARE_URL.test("router.push(`/guess?p=new`);"));
	assert.ok(
		!BARE_URL.test(
			'window.history.replaceState(null, "", localePath(songsHref(q), locale));',
		),
	);
});
