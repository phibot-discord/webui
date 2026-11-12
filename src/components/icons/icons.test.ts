import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconWeight } from "./icon";
import * as icons from "./index";
import { iconUsage } from "./usage.mjs";

const manifest: Record<string, IconWeight[]> = JSON.parse(
	readFileSync(new URL("./manifest.json", import.meta.url), "utf8"),
);

test("the manifest lists exactly the icons and weights the app draws", () => {
	const { used, problems } = iconUsage("src");
	assert.deepEqual(problems, []);
	assert.deepEqual(used, manifest);
});

test("every icon in the manifest draws each of its weights", () => {
	const generated = new Map(Object.entries(icons));
	assert.deepEqual([...generated.keys()].sort(), Object.keys(manifest).sort());
	for (const [name, weights] of Object.entries(manifest)) {
		const Icon = generated.get(name);
		assert.ok(Icon, name);
		for (const weight of weights) {
			const html = renderToStaticMarkup(createElement(Icon, { weight }));
			assert.match(html, /<path d="/, `${name} ${weight}`);
		}
	}
});

test("an icon draws the markup of the package it was copied from", () => {
	assert.equal(
		renderToStaticMarkup(
			createElement(icons.MagnifyingGlass, {
				size: 18,
				weight: "bold",
				"aria-hidden": true,
			}),
		),
		'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z"></path></svg>',
	);
	assert.equal(
		renderToStaticMarkup(createElement(icons.X)),
		'<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>',
	);
});

test("the duotone weight draws a faded shape under the outline", () => {
	assert.equal(
		renderToStaticMarkup(
			createElement(icons.UserCircle, {
				size: 28,
				weight: "duotone",
				"aria-hidden": true,
			}),
		),
		'<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M224,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37h0A96,96,0,1,1,224,128Z" opacity="0.2"></path><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"></path></svg>',
	);
});
