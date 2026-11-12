import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const IMPORT = /import\s*\{([^}]*)\}\s*from\s*"@\/components\/icons";?/g;
const TAG = /<([A-Z][A-Za-z0-9]*)\b([^>]*)>/g;

function tsxFiles(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) tsxFiles(path, out);
		else if (entry.name.endsWith(".tsx")) out.push(path);
	}
	return out;
}

function weightOf(attrs, where, problems) {
	if (/\bweight=\{/.test(attrs))
		problems.push(`${where}: weight must be a string literal`);
	return /\bweight="(\w+)"/.exec(attrs)?.[1] ?? "regular";
}

export function iconUsage(srcDir) {
	const used = {};
	const problems = [];
	const add = (name, weight) => {
		used[name] = [...new Set([...(used[name] ?? []), weight])].sort();
	};
	for (const file of tsxFiles(srcDir)) {
		const text = readFileSync(file, "utf8");
		const names = new Set();
		for (const [, list] of text.matchAll(IMPORT))
			for (const part of list.split(","))
				if (part.trim()) names.add(part.trim());
		if (names.size === 0) continue;
		const where = relative(srcDir, file);
		const body = text.replace(IMPORT, "");
		const direct = {};
		const passed = new Set();
		for (const [, tag, attrs] of body.matchAll(TAG)) {
			if (names.has(tag)) {
				direct[tag] = (direct[tag] ?? 0) + 1;
				add(tag, weightOf(attrs, `${where} <${tag}>`, problems));
			} else if (/\bsize=/.test(attrs)) {
				passed.add(weightOf(attrs, `${where} <${tag}>`, problems));
			}
		}
		for (const name of names) {
			const mentions = body.split(new RegExp(`\\b${name}\\b`)).length - 1;
			if (mentions === (direct[name] ?? 0)) continue;
			if (passed.size === 0)
				problems.push(
					`${where}: ${name} is passed around, but no icon is drawn from a variable`,
				);
			for (const weight of passed) add(name, weight);
		}
	}
	return { used, problems };
}
