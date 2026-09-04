import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { contrastOverBackground } from "./blur";

async function swatch(file: string, hex: string) {
	await sharp({
		create: {
			width: 64,
			height: 64,
			channels: 3,
			background: hex,
		},
	})
		.png()
		.toFile(file);
}

function cardHtml(bg: string, ill: string) {
	return (
		`<html><head></head><body>` +
		`<div class="background"><img src="${bg}" alt=""></div>` +
		`<div class="ill"><img src="${ill}" alt=""></div>` +
		`<div class="playerInfo"><div class="date"><p>2026-09-04</p></div></div>` +
		`<div class="tips"><p>Tip: hello</p></div>` +
		`</body></html>`
	);
}

test("date and tip use black on a light card background", async () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-ink-"));
	const light = join(dir, "light.png");
	const darkIll = join(dir, "dark-ill.png");
	await swatch(light, "#e8e8e8");
	await swatch(darkIll, "#111111");
	const html = await contrastOverBackground(cardHtml(light, darkIll));
	assert.match(html, /color: #000000/);
	assert.match(html, /style="color:#000000/);
	assert.doesNotMatch(html, /color: #ffffff/);
});

test("date and tip use white on a dark card background", async () => {
	const dir = mkdtempSync(join(tmpdir(), "phi-ink-"));
	const dark = join(dir, "dark.png");
	const lightIll = join(dir, "light-ill.png");
	await swatch(dark, "#141414");
	await swatch(lightIll, "#f0f0f0");
	const html = await contrastOverBackground(cardHtml(dark, lightIll));
	assert.match(html, /color: #ffffff/);
	assert.match(html, /style="color:#ffffff/);
	assert.doesNotMatch(html, /color: #000000/);
});
