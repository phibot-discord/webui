import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { RenderEngine } from "./engine";

test("html cards rasterize at 2x while keeping CSS layout size", async () => {
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
	await engine.close();
});
