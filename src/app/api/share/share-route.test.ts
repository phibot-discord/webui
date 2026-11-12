import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setSessionForTest } from "@/auth";
import { setRequestLocaleForTest } from "@/i18n/server";
import { resetRateLimitForTest } from "@/server/rate-limit";
import { DELETE, POST } from "./route";

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

test("a signed-out share request is refused", async () => {
	setSessionForTest(null);
	const res = await POST();
	assert.equal(res.status, 401);
	assert.deepEqual(await res.json(), {
		error: "You are not signed in.",
		code: "unauthorized",
	});
});

test("twenty share changes a minute pass, the next is refused, and other users are not affected", async () => {
	setSessionForTest("u1");
	for (let i = 0; i < 20; i++) {
		const res = i % 2 === 0 ? await POST() : await DELETE();
		assert.equal(res.status, 200);
	}
	const refused = await POST();
	assert.equal(refused.status, 429);
	const body = (await refused.json()) as { code: string };
	assert.equal(body.code, "rate_limit");
	setSessionForTest("u2");
	const other = await POST();
	assert.equal(other.status, 200);
});
