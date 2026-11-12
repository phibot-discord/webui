import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { resetRateLimitForTest } from "@/server/rate-limit";
import { GET } from "./route";

beforeEach(() => {
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
});

afterEach(() => setRequestLocaleForTest());

test("an asset key redirects to its public URL, cacheable by browser and CDN", async () => {
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = "https://r2.example.test";
	try {
		const res = await GET(
			new Request(
				"http://localhost/api/assets?key=original_ill/illLow/A.B.png",
			),
		);
		assert.equal(res.status, 302);
		assert.equal(
			res.headers.get("location"),
			"https://r2.example.test/original_ill/illLow/A.B.png",
		);
		assert.match(res.headers.get("cache-control") ?? "", /s-maxage=\d+/);
		const bad = await GET(
			new Request("http://localhost/api/assets?key=../secret"),
		);
		assert.equal(bad.status, 400);
	} finally {
		process.env = env;
	}
});

test("an address gets 60 asset requests a minute, other addresses are not affected", async () => {
	const from = (ip: string) =>
		GET(
			new Request("http://localhost/api/assets?key=..%2Fx", {
				headers: { "x-forwarded-for": ip },
			}),
		);
	for (let i = 0; i < 60; i++) {
		assert.equal((await from("203.0.113.10")).status, 400, `request ${i + 1}`);
	}
	const refused = await from("203.0.113.10");
	assert.equal(refused.status, 429);
	const body = (await refused.json()) as { code: string };
	assert.equal(body.code, "rate_limit");
	assert.ok(refused.headers.get("retry-after"));
	assert.equal((await from("203.0.113.11")).status, 400);
});
