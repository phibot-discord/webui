import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setSessionForTest } from "@/auth";
import { setRequestLocaleForTest } from "@/i18n/server";
import { rateLimit, resetRateLimitForTest } from "@/server/rate-limit";
import { GET } from "./route";

beforeEach(() => {
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
	setSessionForTest("u1");
});

afterEach(() => {
	setSessionForTest();
	setRequestLocaleForTest();
});

const get = (query: string) =>
	GET(new Request(`http://localhost/api/snapshot?${query}`));

test("the old wrapped view is refused as an unknown view", async () => {
	const res = await get("view=wrapped&lang=en");
	assert.equal(res.status, 404);
	assert.equal((await res.json()).code, "unknown_card");
});

test("the review view passes the view check", async () => {
	for (let i = 0; i < 10; i++) rateLimit({ userId: "u1", ip: "unknown" });
	const res = await get("view=review&lang=en");
	assert.equal(res.status, 429);
	assert.equal((await res.json()).code, "rate_limit");
});
