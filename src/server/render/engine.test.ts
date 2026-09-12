import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { RenderEngine } from "./engine";
import { fitPaint, PIXEL_RATIO } from "./paint-budget";

test("html cards rasterize at 2x while keeping CSS layout size", async () => {
	const warns: string[] = [];
	const origWarn = console.warn;
	console.warn = (...args: unknown[]) => {
		warns.push(args.map(String).join(" "));
		origWarn.apply(console, args);
	};
	try {
		const engine = new RenderEngine();
		await engine.init();
		const img = await engine.renderHtml(
			`<!DOCTYPE html><html><body style="margin:0"><div style="width:100%;height:80px;background:#ff0000"></div></body></html>`,
			{ width: 400, height: 80, format: "png", id: "dpr-smoke" },
		);
		const painted = await sharp(img.bytes).raw().ensureAlpha().toBuffer({
			resolveWithObject: true,
		});
		assert.equal(img.width, 400);
		assert.equal(img.height, 80);
		assert.equal(painted.info.width, 800);
		assert.equal(painted.info.height, 160);
		const at = (x: number, y: number) => {
			const i = (y * painted.info.width + x) * 4;
			return [
				painted.data[i] ?? 0,
				painted.data[i + 1] ?? 0,
				painted.data[i + 2] ?? 0,
			];
		};
		assert.deepEqual(at(10, 10), [255, 0, 0]);
		assert.deepEqual(at(410, 10), [255, 0, 0]);
		assert.deepEqual(at(790, 10), [255, 0, 0]);
		assert.equal(
			warns.filter((w) => /stylesheets/i.test(w)).length,
			0,
			warns.join("\n"),
		);
		await engine.close();
	} finally {
		console.warn = origWarn;
	}
});

test("over-budget paint keeps the right and bottom edges", async () => {
	const engine = new RenderEngine();
	await engine.init();
	const cssW = 1200;
	const cssH = 4000;
	const img = await engine.renderHtml(
		`<!DOCTYPE html><html><body style="margin:0"><div style="position:relative;width:100%;height:4000px;background:#00ff00"><div style="position:absolute;right:0;bottom:0;width:24px;height:24px;background:#ff0000"></div></div></body></html>`,
		{ width: cssW, height: cssH, format: "png", id: "crop-smoke" },
	);
	const painted = await sharp(img.bytes).raw().ensureAlpha().toBuffer({
		resolveWithObject: true,
	});
	const paint = fitPaint(cssW, cssH);
	assert.ok(paint.ratio < PIXEL_RATIO);
	assert.equal(paint.ratio, 1);
	assert.equal(painted.info.width, 1200);
	assert.equal(painted.info.height, 4000);
	const at = (x: number, y: number) => {
		const i = (y * painted.info.width + x) * 4;
		return [
			painted.data[i] ?? 0,
			painted.data[i + 1] ?? 0,
			painted.data[i + 2] ?? 0,
		];
	};
	assert.deepEqual(at(10, 10), [0, 255, 0]);
	assert.deepEqual(
		at(painted.info.width - 6, painted.info.height - 6),
		[255, 0, 0],
	);
	await engine.close();
});

test("high-quality over-budget paint fills the cap and keeps the edges", async () => {
	const engine = new RenderEngine();
	await engine.init();
	const cssW = 1200;
	const cssH = 4000;
	const img = await engine.renderHtml(
		`<!DOCTYPE html><html><body style="margin:0"><div style="position:relative;width:100%;height:4000px;background:#00ff00"><div style="position:absolute;right:0;bottom:0;width:24px;height:24px;background:#ff0000"></div></div></body></html>`,
		{
			width: cssW,
			height: cssH,
			format: "png",
			id: "crop-high",
			paintQuality: "high",
		},
	);
	const painted = await sharp(img.bytes).raw().ensureAlpha().toBuffer({
		resolveWithObject: true,
	});
	const paint = fitPaint(cssW, cssH, PIXEL_RATIO, "high");
	assert.ok(paint.ratio > 1);
	assert.ok(paint.ratio < PIXEL_RATIO);
	assert.equal(painted.info.width, paint.width);
	assert.equal(painted.info.height, paint.height);
	const at = (x: number, y: number) => {
		const i = (y * painted.info.width + x) * 4;
		return [
			painted.data[i] ?? 0,
			painted.data[i + 1] ?? 0,
			painted.data[i + 2] ?? 0,
		];
	};
	assert.deepEqual(at(10, 10), [0, 255, 0]);
	assert.deepEqual(
		at(painted.info.width - 6, painted.info.height - 6),
		[255, 0, 0],
	);
	await engine.close();
});
