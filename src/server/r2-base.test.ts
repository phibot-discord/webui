import assert from "node:assert/strict";
import test from "node:test";
import {
	listRequest,
	objectRequest,
	objectUrl,
	type R2Config,
	r2WriteReady,
} from "./r2-base";

const cfg: R2Config = {
	accountId: "acc",
	apiToken: "t",
	bucket: "b",
	publicBase: "",
};

test("an object URL encodes each segment and keeps the slashes", () => {
	assert.equal(
		objectUrl(cfg, "chart/A B.C/IN.json"),
		"https://api.cloudflare.com/client/v4/accounts/acc/r2/buckets/b/objects/chart/A%20B.C/IN.json",
	);
});

test("a key with a dot segment is refused", () => {
	for (const key of ["chart/../x.json", "../x", "a/./b"]) {
		assert.throws(() => objectUrl(cfg, key), /r2 key has a dot segment/, key);
	}
});

test("dots inside a segment are fine", () => {
	for (const key of ["chart/Glaciaxion.SunsetRay/IN.json", "a/..b/c"]) {
		assert.doesNotThrow(() => objectUrl(cfg, key), key);
	}
});

test("without a key pair, requests still go to the REST API with the token", () => {
	assert.deepEqual(objectRequest(cfg, "GET", "a b.json"), {
		url: "https://api.cloudflare.com/client/v4/accounts/acc/r2/buckets/b/objects/a%20b.json",
		headers: { Authorization: "Bearer t" },
	});
	const list = listRequest(cfg, "cards/", "c1").url;
	assert.ok(
		list.endsWith("/objects?prefix=cards%2F&per_page=1000&cursor=c1"),
		list,
	);
});

test("the key pair alone makes R2 ready, the token alone too, and neither does not", () => {
	assert.equal(
		r2WriteReady({
			...cfg,
			apiToken: "",
			s3: {
				endpoint: "http://127.0.0.1:9",
				accessKeyId: "test-key-id",
				secretAccessKey: "test-secret",
			},
		}),
		true,
	);
	assert.equal(r2WriteReady(cfg), true);
	assert.equal(r2WriteReady({ ...cfg, apiToken: "" }), false);
	assert.equal(r2WriteReady({ ...cfg, bucket: "" }), false);
});
