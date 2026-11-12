import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const ALLOWED = new Set([
	"@/server/card-kinds",
	"@/server/cooldown",
	"@/server/render/paint-budget",
]);

const USE_CLIENT = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/;
const FROM =
	/(?:^|\n)[ \t]*(import|export)\s+([^;"'`]*?)\s*from\s*["'](@\/server\/[^"']+)["']/g;
const BARE = /(?:^|\n)[ \t]*import\s*["'](@\/server\/[^"']+)["']/g;
const DYNAMIC = /\bimport\(\s*["'](@\/server\/[^"']+)["']\s*\)/g;

function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory()
			? sources(join(dir, e.name))
			: /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)
				? [join(dir, e.name)]
				: [],
	);
}

function typeOnly(clause: string): boolean {
	const text = clause.trim();
	if (/^type\b/.test(text)) return true;
	const [, inner = ""] = /^\{([\s\S]*)\}$/.exec(text) ?? [];
	const specs = inner
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	return specs.length > 0 && specs.every((s) => /^type\s/.test(s));
}

function valueImports(text: string): string[] {
	const out: string[] = [];
	for (const [, , clause = "", mod = ""] of text.matchAll(FROM)) {
		if (!typeOnly(clause)) out.push(mod);
	}
	for (const [, mod = ""] of text.matchAll(BARE)) out.push(mod);
	for (const [, mod = ""] of text.matchAll(DYNAMIC)) out.push(mod);
	return out.filter((mod) => !ALLOWED.has(mod));
}

function checked(): string[] {
	const client = ["src/components", "src/app"].flatMap((dir) =>
		sources(join(ROOT, dir)).filter((file) =>
			USE_CLIENT.test(readFileSync(file, "utf8")),
		),
	);
	return [...client, ...sources(join(ROOT, "src/lib"))];
}

test("client code imports only types from server modules, plus three constant modules", () => {
	const files = checked();
	assert.ok(files.length > 0);
	const offenders = files.flatMap((file) =>
		valueImports(readFileSync(file, "utf8")).map(
			(mod) => `${relative(ROOT, file).split(sep).join("/")}: ${mod}`,
		),
	);
	assert.deepEqual(
		offenders,
		[],
		`server code reached client bundles:\n${offenders.join("\n")}`,
	);
});

test("the check tells type imports from value imports", () => {
	assert.deepEqual(
		valueImports(
			[
				'import { a } from "@/lib/a";',
				'import type { B } from "@/server/b";',
				'import { type C, type D } from "@/server/c";',
				'import {\n\ttype E,\n\tf,\n} from "@/server/e";',
				'import G from "@/server/g";',
				'export type { H } from "@/server/h";',
				'export { i } from "@/server/i";',
				'import "@/server/j";',
				'const k = await import("@/server/k");',
				'import { l } from "@/server/cooldown";',
			].join("\n"),
		),
		["@/server/e", "@/server/g", "@/server/i", "@/server/j", "@/server/k"],
	);
});
