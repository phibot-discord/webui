import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setSessionForTest } from "@/auth";
import { setRequestLocaleForTest } from "@/i18n/server";
import { rateLimit, resetRateLimitForTest } from "@/server/rate-limit";
import { POST } from "./route";

const kv = new Map<string, string>();
const sets: [string, string][] = [];
const db = {
	get: async (key: string) => kv.get(key),
	set: async (key: string, value: string) => {
		sets.push([key, value]);
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
	sets.length = 0;
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
});

afterEach(() => {
	setSessionForTest();
	setRequestLocaleForTest();
});

function post(body: unknown) {
	return POST(
		new Request("http://localhost/api/notes", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

test("a signed-out request is refused", async () => {
	setSessionForTest(null);
	const res = await post({ showTagAnalysis: false });
	assert.equal(res.status, 401);
	assert.equal(sets.length, 0);
});

test("a valid body is stored with one write", async () => {
	setSessionForTest("u1");
	const res = await post({ showTagAnalysis: false, peerWait: true });
	assert.equal(res.status, 200);
	assert.equal(sets.length, 1);
	const [write] = sets;
	assert.ok(write);
	const stored = JSON.parse(write[1]) as Record<string, unknown>;
	assert.equal(stored.showTagAnalysis, false);
	assert.equal(stored.peerWait, true);
});

test("a body with one invalid field stores nothing", async () => {
	setSessionForTest("u1");
	const res = await post({ peerWait: true, rankScope: "x" });
	assert.equal(res.status, 400);
	assert.equal(sets.length, 0);
});

test("a refused body is explained in words and names its code", async () => {
	setSessionForTest("u1");
	const res = await post({ peerWait: true, rankScope: "x" });
	assert.equal(res.status, 400);
	assert.deepEqual(await res.json(), {
		error: "The request was not valid.",
		code: "bad_request",
	});
});

test("thirty saves a minute pass, the next is refused, and card renders keep their tokens", async () => {
	setSessionForTest("u1");
	for (let i = 0; i < 30; i++) {
		const res = await post({ peerWait: i % 2 === 0 });
		assert.equal(res.status, 200);
	}
	const refused = await post({ peerWait: true });
	assert.equal(refused.status, 429);
	assert.ok(Number(refused.headers.get("retry-after")) >= 1);
	const body = (await refused.json()) as { code: string };
	assert.equal(body.code, "rate_limit");
	assert.equal(sets.length, 30);
	assert.equal(rateLimit({ userId: "u1", ip: "unknown" }).ok, true);
	setSessionForTest("u2");
	const other = await post({ peerWait: true });
	assert.equal(other.status, 200);
});
