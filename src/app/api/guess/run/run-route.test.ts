import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setSessionForTest } from "@/auth";
import { setRequestLocaleForTest } from "@/i18n/server";
import { dailyId } from "@/lib/guess";
import { rateLimit, resetRateLimitForTest } from "@/server/rate-limit";
import { GET } from "./route";

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
	kv.clear();
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
});

afterEach(() => {
	setSessionForTest();
	setRequestLocaleForTest();
});

function get(ip: string) {
	return GET(
		new Request(
			`http://localhost/api/guess/run?p=${encodeURIComponent(dailyId())}`,
			{ headers: { "x-forwarded-for": ip } },
		),
	);
}

test("a signed-in player gets thirty run reads a minute wherever they come from", async () => {
	setSessionForTest("u1");
	for (let i = 0; i < 30; i++) {
		const res = await get(`203.0.113.${i + 1}`);
		assert.equal(res.status, 200);
	}
	const refused = await get("203.0.113.99");
	assert.equal(refused.status, 429);
	assert.ok(Number(refused.headers.get("retry-after")) >= 1);
	assert.equal(((await refused.json()) as { code: string }).code, "rate_limit");
	setSessionForTest("u2");
	assert.equal((await get("203.0.113.99")).status, 200);
	assert.equal(rateLimit({ ip: "guess:203.0.113.99" }).ok, true);
});

test("a signed-out caller gets thirty run reads a minute per address", async () => {
	setSessionForTest(null);
	for (let i = 0; i < 30; i++) {
		const res = await get("198.51.100.7");
		assert.equal(res.status, 200);
		assert.deepEqual(((await res.json()) as { run: unknown }).run, null);
	}
	assert.equal((await get("198.51.100.7")).status, 429);
	assert.equal((await get("198.51.100.8")).status, 200);
});
