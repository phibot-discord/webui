import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

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
