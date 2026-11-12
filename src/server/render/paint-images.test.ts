import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
	BG_MAX_EDGE,
	fitPaintImages,
	LARGE_MAX_EDGE,
	maxEdgeFor,
	TILE_MAX_EDGE,
} from "./paint-images";

test("tile images larger than the paint budget are downscaled", async () => {
	const src = await sharp({
		create: {
			width: 1600,
			height: 900,
			channels: 3,
			background: { r: 255, g: 0, b: 0 },
		},
	})
		.png()
		.toBuffer();
	const [out] = await fitPaintImages([
		{ src: "file:///tmp/illLow/song.png", data: new Uint8Array(src) },
	]);
	assert.ok(out);
	const meta = await sharp(out.data).metadata();
	assert.ok((meta.width ?? 0) <= TILE_MAX_EDGE);
	assert.ok((meta.height ?? 0) <= TILE_MAX_EDGE);
});

test("blurred backgrounds keep a larger max edge", async () => {
	assert.equal(maxEdgeFor("/tmp/phi-web-ill-blur/abc.png"), BG_MAX_EDGE);
	assert.equal(maxEdgeFor("file:///illLow/song.png"), TILE_MAX_EDGE);
	const src = await sharp({
		create: {
			width: 1800,
			height: 1800,
			channels: 3,
			background: { r: 0, g: 0, b: 255 },
		},
	})
		.png()
		.toBuffer();
	const [out] = await fitPaintImages([
		{
			src: "file:///tmp/phi-web-ill-blur/abc.png",
			data: new Uint8Array(src),
		},
	]);
	assert.ok(out);
	const meta = await sharp(out.data).metadata();
	assert.equal(meta.width, 1800);
	assert.equal(meta.height, 1800);
});

test("full-size jackets may keep 1536 px", () => {
	assert.equal(maxEdgeFor("/tmp/x/original_ill/ill/A.png"), 1536);
	assert.equal(maxEdgeFor("/tmp/x/original_ill/illLow/A.png"), 640);
	assert.equal(maxEdgeFor("/tmp/x/original_ill/illBlur/A.png"), 2048);
	assert.equal(LARGE_MAX_EDGE, 1536);
});
