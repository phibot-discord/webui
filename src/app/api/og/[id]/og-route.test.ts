import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { resetRateLimitForTest } from "@/server/rate-limit";
import { GET } from "./route";

beforeEach(() => resetRateLimitForTest());

test("an address gets 30 page images a minute, then the fallback image", async () => {
	const from = (ip: string) =>
		GET(
			new Request("http://localhost/api/og/nope", {
				headers: { "x-forwarded-for": ip },
			}),
			{ params: Promise.resolve({ id: "nope" }) },
		);
	for (let i = 0; i < 30; i++) {
		assert.equal((await from("203.0.113.50")).status, 404, `request ${i + 1}`);
	}
	const refused = await from("203.0.113.50");
	assert.equal(refused.status, 302);
	assert.equal(refused.headers.get("location"), "/og/fallback.jpg");
	assert.equal((await from("203.0.113.51")).status, 404);
});
