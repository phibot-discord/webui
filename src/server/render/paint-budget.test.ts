import assert from "node:assert/strict";
import test from "node:test";
import { fitPaint, MAX_PIXMAP_PIXELS, PIXEL_RATIO } from "./paint-budget";

test("2x paint is unchanged when the pixmap fits", () => {
	const paint = fitPaint(1200, 2500);
	assert.equal(paint.ratio, PIXEL_RATIO);
	assert.equal(paint.width, 2400);
	assert.equal(paint.height, 5000);
	assert.ok(paint.width * paint.height <= MAX_PIXMAP_PIXELS);
});

test("engine smoke card stays 2x", () => {
	const paint = fitPaint(400, 80);
	assert.equal(paint.width, 800);
	assert.equal(paint.height, 160);
});

test("tall b30 cards paint at 1x in fast mode", () => {
	const paint = fitPaint(1200, 4000, PIXEL_RATIO, "fast");
	assert.equal(paint.ratio, 1);
	assert.equal(paint.width, 1200);
	assert.equal(paint.height, 4000);
});

test("tall b30 cards fill the 16M cap in high mode", () => {
	const paint = fitPaint(1200, 4000, PIXEL_RATIO, "high");
	assert.ok(paint.ratio < PIXEL_RATIO);
	assert.ok(paint.ratio > 1);
	assert.ok(paint.width * paint.height <= MAX_PIXMAP_PIXELS);
	assert.ok(1200 * paint.ratio <= paint.width + 1e-9);
	assert.ok(4000 * paint.ratio <= paint.height + 1e-9);
});

test("60-chart height still fits exact 2x", () => {
	const paint = fitPaint(1200, 3495);
	assert.equal(paint.ratio, PIXEL_RATIO);
	assert.equal(paint.width, 2400);
	assert.equal(paint.height, 6990);
});
