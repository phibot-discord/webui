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

test("a full charts bucket refuses the address before any catalog work", async () => {
	for (let i = 0; i < 60; i++) rateLimitBy("charts:203.0.113.30", 60);
	const res = await GET(
		new Request("http://localhost/api/charts", {
			headers: { "x-forwarded-for": "203.0.113.30" },
		}),
	);
	assert.equal(res.status, 429);
	const body = (await res.json()) as { code: string };
	assert.equal(body.code, "rate_limit");
	assert.ok(Number(res.headers.get("retry-after")) >= 1);
});
