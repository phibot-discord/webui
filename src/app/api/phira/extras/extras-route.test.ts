import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { rateLimitBy, resetRateLimitForTest } from "@/server/rate-limit";
import { GET } from "./route";

beforeEach(() => {
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
});

afterEach(() => setRequestLocaleForTest());

test("a full extras bucket refuses the address before any storage work", async () => {
	for (let i = 0; i < 60; i++) rateLimitBy("phira-extras:203.0.113.40", 60);
	const res = await GET(
		new Request("http://localhost/api/phira/extras?id=x", {
			headers: { "x-forwarded-for": "203.0.113.40" },
		}),
	);
	assert.equal(res.status, 429);
	const body = (await res.json()) as { code: string };
	assert.equal(body.code, "rate_limit");
	assert.ok(Number(res.headers.get("retry-after")) >= 1);
});
