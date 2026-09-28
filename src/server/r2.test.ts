import assert from "node:assert/strict";
import test from "node:test";
import { r2BucketName } from "./r2";

test("R2 bucket falls back when vercel env pull leaves a placeholder", () => {
	assert.equal(r2BucketName("phi-web-assets"), "phi-web-assets");
	assert.equal(r2BucketName(""), "phi-web-assets");
	assert.equal(r2BucketName("  "), "phi-web-assets");
	assert.equal(r2BucketName("[SENSITIVE]"), "phi-web-assets");
	assert.equal(r2BucketName(undefined), "phi-web-assets");
});

test("CLOUDFLARE_R2_BUCKET=off turns R2 off instead of using the default bucket", () => {
	assert.equal(r2BucketName("off"), "");
	assert.equal(r2BucketName(""), "phi-web-assets");
});
