import assert from "node:assert/strict";
import test from "node:test";
import { catalogs } from "./server";

const PLACEHOLDER = /\{(\w+)\}/g;

function flatten(
	value: unknown,
	path = "",
	out = new Map<string, string>(),
): Map<string, string> {
	if (typeof value === "string") out.set(path, value);
	else if (Array.isArray(value)) {
		value.forEach((v, i) => {
			flatten(v, `${path}[${i}]`, out);
		});
	} else if (value && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) {
			flatten(v, path ? `${path}.${k}` : k, out);
		}
	}
	return out;
}

function placeholders(text: string): string[] {
	return [
		...new Set([...text.matchAll(PLACEHOLDER)].map(([, name = ""]) => name)),
	].sort();
}

const flat = {
	en: flatten(catalogs.en),
	zh: flatten(catalogs.zh),
	ja: flatten(catalogs.ja),
};

test("every catalog has the same messages", () => {
	const en = [...flat.en.keys()].sort();
	assert.ok(en.length > 0);
	for (const locale of ["zh", "ja"] as const) {
		const other = [...flat[locale].keys()].sort();
		assert.deepEqual(
			other.filter((p) => !flat.en.has(p)),
			[],
			`${locale} has paths en lacks`,
		);
		assert.deepEqual(
			en.filter((p) => !flat[locale].has(p)),
			[],
			`${locale} lacks paths en has`,
		);
	}
});

test("every translation keeps the placeholders of the English text", () => {
	const mismatches: string[] = [];
	for (const [path, text] of flat.en) {
		const want = placeholders(text).join(",");
		for (const locale of ["zh", "ja"] as const) {
			const other = flat[locale].get(path);
			if (other === undefined) continue;
			const got = placeholders(other).join(",");
			if (got !== want) {
				mismatches.push(`${locale} ${path}: {${got}} vs en {${want}}`);
			}
		}
	}
	assert.deepEqual(mismatches, []);
});
