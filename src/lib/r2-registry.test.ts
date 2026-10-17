import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PUBLIC_ASSET_PREFIXES } from "./assets";

type Registry = {
	writers: Record<string, string>;
	trees: { prefix: string; writer: string; except?: Record<string, string> }[];
};

const registry = JSON.parse(
	readFileSync(join(process.cwd(), "scripts/r2-registry.json"), "utf8"),
) as Registry;

test("the R2 registry names a known writer for every tree, once", () => {
	const seen = new Set<string>();
	for (const tree of registry.trees) {
		assert.ok(registry.writers[tree.writer], `${tree.prefix}: ${tree.writer}`);
		assert.ok(!seen.has(tree.prefix), `${tree.prefix} listed twice`);
		seen.add(tree.prefix);
	}
});

test("every prefix the site lists has an owner in the R2 registry", () => {
	for (const prefix of PUBLIC_ASSET_PREFIXES) {
		const owned = registry.trees.some(
			(tree) =>
				prefix.startsWith(tree.prefix) || tree.prefix.startsWith(prefix),
		);
		assert.ok(owned, `${prefix} has no entry in scripts/r2-registry.json`);
	}
});
