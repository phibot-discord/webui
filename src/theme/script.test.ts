import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { themeFromCookie } from "./config";
import { THEME_SCRIPT } from "./script";

function run(cookie: string) {
	const attributes: Record<string, string> = {};
	const style: { colorScheme?: string } = {};
	const document = {
		cookie,
		documentElement: {
			style,
			setAttribute(name: string, value: string) {
				attributes[name] = String(value);
			},
		},
	};
	vm.runInNewContext(THEME_SCRIPT, { document });
	return { attributes, colorScheme: style.colorScheme };
}

test("the script applies a saved light or dark theme", () => {
	assert.deepEqual(run("phi-theme=dark"), {
		attributes: { "data-theme": "dark" },
		colorScheme: "dark",
	});
	assert.deepEqual(run("a=1; phi-theme=light; b=2"), {
		attributes: { "data-theme": "light" },
		colorScheme: "light",
	});
});

test("the script leaves the page alone without a valid theme", () => {
	for (const cookie of ["", "phi-theme=blue", "xphi-theme=dark"]) {
		assert.deepEqual(run(cookie), {
			attributes: {},
			colorScheme: undefined,
		});
	}
});

test("themeFromCookie reads only a valid phi-theme", () => {
	assert.equal(themeFromCookie("phi-theme=dark"), "dark");
	assert.equal(themeFromCookie("a=1; phi-theme=light; b=2"), "light");
	assert.equal(themeFromCookie(""), null);
	assert.equal(themeFromCookie("phi-theme=blue"), null);
	assert.equal(themeFromCookie("xphi-theme=dark"), null);
});
