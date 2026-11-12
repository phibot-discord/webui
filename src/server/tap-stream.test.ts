import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";
import { tapWaitNdjson } from "./tap-stream";

beforeEach(() => {
	setRequestLocaleForTest("en");
});

afterEach(() => {
	setRequestLocaleForTest();
});

test("a result reaches the reader", async () => {
	const res = tapWaitNdjson("u1", async () => ({ ok: true, n: 1 }));
	const { data } = await readJsonWithTapWait(res, () => {});
	assert.deepEqual(data, { ok: true, n: 1 });
	assert.equal(tapWaitFailed(res, data), false);
});

test("a thrown error becomes the fallback error line", async (t) => {
	t.mock.method(console, "error", () => {});
	const res = tapWaitNdjson(
		"u1",
		async () => {
			throw new Error("boom");
		},
		"render_failed",
	);
	const { data } = await readJsonWithTapWait(res, () => {});
	assert.equal(data.code, "render_failed");
	assert.equal(data.status, 502);
	assert.equal(tapWaitFailed(res, data), true);
});
