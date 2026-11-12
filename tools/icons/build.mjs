#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { iconUsage } from "../../src/components/icons/usage.mjs";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(ROOT, "src/components/icons");
const PACKAGE = "@phosphor-icons/react";
const VERSION = "2.1.10";

const manifest = JSON.parse(readFileSync(join(DIR, "manifest.json"), "utf8"));
const { used, problems } = iconUsage(join(ROOT, "src"));
for (const [name, weights] of Object.entries(used))
	for (const weight of weights)
		if (!manifest[name]?.includes(weight))
			problems.push(
				`${name} is drawn with weight "${weight}", add it to manifest.json`,
			);
if (problems.length) {
	console.error(problems.join("\n"));
	process.exit(1);
}

let pkgDir;
try {
	pkgDir = dirname(require.resolve(`${PACKAGE}/package.json`));
} catch {
	console.error(
		`run "pnpm add -D ${PACKAGE}@${VERSION}" first, and remove it again afterwards`,
	);
	process.exit(1);
}
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
if (pkg.version !== VERSION) {
	console.error(`${PACKAGE} is ${pkg.version}, expected ${VERSION}`);
	process.exit(1);
}

function element(node, where) {
	const attrs = Object.entries(node.props).map(([key, value]) => {
		if (typeof value !== "string" || /["{}\\]/.test(value))
			throw Error(`${where}: unexpected ${key} on <${node.type}>`);
		return `${key}="${value}"`;
	});
	return `<${node.type} ${attrs.join(" ")} />`;
}

const out = ['import { icon } from "./icon";', ""];
for (const [name, weights] of Object.entries(manifest)) {
	const file = join(pkgDir, "dist/defs", `${name}.es.js`);
	const shapes = (await import(pathToFileURL(file).href)).default;
	out.push(`export const ${name} = icon({`);
	for (const weight of weights) {
		const shape = shapes.get(weight);
		if (!shape) throw Error(`${name} has no ${weight} weight`);
		const parts = [shape.props.children]
			.flat()
			.map((node) => element(node, `${name} ${weight}`));
		out.push(
			`\t${weight}: ${parts.length === 1 ? parts[0] : `<>${parts.join("")}</>`},`,
		);
	}
	out.push("});", "");
}
writeFileSync(join(DIR, "index.tsx"), out.join("\n"));
writeFileSync(
	join(DIR, "LICENSE-phosphor.txt"),
	`The SVG path data in index.tsx is copied from ${PACKAGE} ${VERSION} (https://phosphoricons.com).\n\n${readFileSync(join(pkgDir, "LICENSE"), "utf8")}`,
);
execFileSync(
	process.execPath,
	[
		require.resolve("@biomejs/biome/bin/biome"),
		"format",
		"--write",
		join(DIR, "index.tsx"),
	],
	{ cwd: ROOT, stdio: "inherit" },
);
console.log(`index.tsx: ${Object.keys(manifest).length} icons`);
