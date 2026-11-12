import assert from "node:assert/strict";
import test from "node:test";
import { readAssetPage } from "@/lib/assets";
import { parseS3List, type R2S3, r2S3FromEnv, s3Request } from "./r2-s3";
import { sha256Hex } from "./sigv4";

const keys = {
	CLOUDFLARE_R2_ACCESS_KEY_ID: "test-key-id",
	CLOUDFLARE_R2_SECRET_ACCESS_KEY: "test-secret",
};

const s3: R2S3 = {
	endpoint: "https://acc.r2.cloudflarestorage.com",
	accessKeyId: "test-key-id",
	secretAccessKey: "test-secret",
};

test("the endpoint comes from the account id unless overridden, and both keys are needed", () => {
	assert.equal(
		r2S3FromEnv("acc", keys)?.endpoint,
		"https://acc.r2.cloudflarestorage.com",
	);
	assert.equal(
		r2S3FromEnv("acc", {
			...keys,
			CLOUDFLARE_R2_S3_ENDPOINT: "http://127.0.0.1:9/",
		})?.endpoint,
		"http://127.0.0.1:9",
	);
	assert.equal(
		r2S3FromEnv("acc", {
			CLOUDFLARE_R2_ACCESS_KEY_ID: "test-key-id",
		}),
		undefined,
	);
	assert.equal(r2S3FromEnv("", keys), undefined);
});

test("a signed request puts the bucket in the path and signs host, payload hash and date", () => {
	const req = s3Request(s3, "phi-web-cache", "PUT", "cards/a b(1).jpg", {
		body: Buffer.from("x"),
		now: new Date("2026-11-11T00:00:00Z"),
	});
	assert.equal(
		req.url,
		"https://acc.r2.cloudflarestorage.com/phi-web-cache/cards/a%20b%281%29.jpg",
	);
	assert.equal(req.headers["x-amz-content-sha256"], sha256Hex("x"));
	assert.equal(req.headers["x-amz-date"], "20261111T000000Z");
	assert.match(
		req.headers.Authorization ?? "",
		/^AWS4-HMAC-SHA256 Credential=test-key-id\/20261111\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
	);
	assert.ok(!req.url.includes("test-secret"));
	for (const value of Object.values(req.headers)) {
		assert.ok(!value.includes("test-secret"), value);
	}
});

test("a listing request sends the sorted, encoded query it signed", () => {
	const req = s3Request(s3, "phi-web-cache", "GET", undefined, {
		query: {
			prefix: "cards/a b",
			"list-type": "2",
			"max-keys": "1000",
			"continuation-token": "x+y/z=",
		},
	});
	assert.ok(
		req.url.endsWith(
			"/phi-web-cache?continuation-token=x%2By%2Fz%3D&list-type=2&max-keys=1000&prefix=cards%2Fa%20b",
		),
		req.url,
	);
});

test("a key with a dot segment is refused", () => {
	assert.throws(
		() => s3Request(s3, "phi-web-cache", "GET", "a/../b"),
		/dot segment/,
	);
});

test("a listing page reads into the REST shape with entities decoded", () => {
	const page = parseS3List(
		[
			"<ListBucketResult>",
			"<Contents><Key>a&amp;b &#x66F2;.png</Key><ETag>&quot;0123456789abcdef&quot;</ETag><Size>12</Size></Contents>",
			"<Contents><Key>bad&#x110000;&#99999999;.png</Key><ETag>&quot;fedcba9876543210&quot;</ETag><Size>3</Size></Contents>",
			"<IsTruncated>true</IsTruncated><NextContinuationToken>t1</NextContinuationToken>",
			"</ListBucketResult>",
		].join(""),
	);
	assert.deepEqual(page.result[0], {
		key: "a&b 曲.png",
		size: 12,
		etag: '"0123456789abcdef"',
	});
	assert.equal(page.result[1]?.key, "bad&#x110000;&#99999999;.png");
	assert.deepEqual(page.result_info, { is_truncated: true, cursor: "t1" });
	assert.equal(readAssetPage(page, () => true).files[0]?.v, "0123456789ab");
	const last = parseS3List(
		"<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>",
	);
	assert.deepEqual(last.result_info, { is_truncated: false });
});
