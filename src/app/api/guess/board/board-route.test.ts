import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { resetRateLimitForTest } from "@/server/rate-limit";
import { GET } from "./route";

beforeEach(() => {
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
});

afterEach(() => {
	setRequestLocaleForTest();
});

test("a board request for a day that cannot have a board is refused before any lookup", async () => {
	for (const day of [
		"2025-99-99",
		"2026-02-30",
		"2026-09-31",
		"2026-10-30",
		"0000-00-00",
	]) {
		const res = await GET(
			new Request(`http://localhost/api/guess/board?day=${day}`),
		);
		assert.equal(res.status, 400, day);
		assert.deepEqual(await res.json(), {
			error: "The request was not valid.",
			code: "bad_request",
		});
	}
});
