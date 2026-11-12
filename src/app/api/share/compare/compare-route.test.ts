import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setSessionForTest } from "@/auth";
import { setRequestLocaleForTest } from "@/i18n/server";
import { rateLimit, resetRateLimitForTest } from "@/server/rate-limit";
import { createShare, resetShareMemForTest } from "@/server/share";
import { POST } from "./route";

const kv = new Map<string, string>();
const db = {
	get: async (key: string) => kv.get(key),
	set: async (key: string, value: string) => {
		kv.set(key, value);
	},
	del: async (...keys: string[]) => {
		for (const k of keys) kv.delete(k);
	},
};
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
});

beforeEach(() => {
	resetShareMemForTest();
	kv.clear();
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
});

afterEach(() => {
	setSessionForTest();
	setRequestLocaleForTest();
});

function post(on: boolean) {
	return POST(
		new Request("http://localhost/api/share/compare", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ on }),
		}),
	);
}

test("twenty compare switches a minute pass, the next is refused, and card renders keep their tokens", async () => {
	await createShare("u1");
	await createShare("u2");
	setSessionForTest("u1");
	for (let i = 0; i < 20; i++) {
		const res = await post(i % 2 === 0);
		assert.equal(res.status, 200);
	}
	const refused = await post(true);
	assert.equal(refused.status, 429);
	assert.equal(((await refused.json()) as { code: string }).code, "rate_limit");
	assert.equal(rateLimit({ userId: "u1", ip: "unknown" }).ok, true);
	setSessionForTest("u2");
	assert.equal((await post(true)).status, 200);
});

test("a compare switch without a share link is refused with a sentence", async () => {
	setSessionForTest("u9");
	const res = await POST(
		new Request("http://localhost/api/share/compare", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ on: true }),
		}),
	);
	assert.equal(res.status, 409);
	assert.deepEqual(await res.json(), {
		error: "This share link does not exist.",
		code: "share_not_found",
	});
});
