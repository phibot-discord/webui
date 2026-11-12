import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { resetRateLimitForTest } from "@/server/rate-limit";
import { POST } from "./route";

beforeEach(() => {
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
});

afterEach(() => {
	setRequestLocaleForTest();
});

function post(ip: string) {
	return POST(
		new Request("http://localhost/api/locale", {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
			body: JSON.stringify({ locale: "xx" }),
		}),
	);
}

test("an address gets thirty locale requests a minute, other addresses are not affected", async () => {
	for (let i = 0; i < 30; i++) {
		const res = await post("203.0.113.5");
		assert.equal(res.status, 400);
	}
	const refused = await post("203.0.113.5");
	assert.equal(refused.status, 429);
	const body = (await refused.json()) as { code: string };
	assert.equal(body.code, "rate_limit");
	const other = await post("203.0.113.6");
	assert.equal(other.status, 400);
});
