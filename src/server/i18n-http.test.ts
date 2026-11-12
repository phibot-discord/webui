import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { codeError } from "./i18n-http";

afterEach(() => setRequestLocaleForTest());

test("a catalog code answers in the request's language and keeps its code", async () => {
	setRequestLocaleForTest("zh");
	const zh = await codeError(400, "bad_request");
	assert.equal(zh.status, 400);
	assert.equal(zh.headers.get("cache-control"), "no-store");
	assert.deepEqual(await zh.json(), { error: "请求无效", code: "bad_request" });
	setRequestLocaleForTest("en");
	const en = await codeError(400, "bad_request");
	assert.deepEqual(await en.json(), {
		error: "The request was not valid.",
		code: "bad_request",
	});
});

test("a code the catalog lacks is its own text, without a language lookup", async () => {
	const res = await codeError(503, "unavailable");
	assert.equal(res.status, 503);
	assert.deepEqual(await res.json(), {
		error: "unavailable",
		code: "unavailable",
	});
});

test("a stable code keeps the code as its text", async () => {
	const res = await codeError(404, "unknown_chart", { stable: true });
	assert.equal(res.status, 404);
	assert.deepEqual(await res.json(), {
		error: "unknown_chart",
		code: "unknown_chart",
	});
});

test("a detail follows the text and stays its own field", async () => {
	setRequestLocaleForTest("en");
	const res = await codeError(400, "unknown_chart", {
		detail: "Credits.Frums.0 EZ",
	});
	assert.deepEqual(await res.json(), {
		error: "A chart is not in the song list. Credits.Frums.0 EZ",
		code: "unknown_chart",
		detail: "Credits.Frums.0 EZ",
	});
});

test("extra headers are kept and may replace the cache header", async () => {
	const res = await codeError(404, "no_data", {
		stable: true,
		headers: { "Cache-Control": "public, max-age=60", "Retry-After": "30" },
	});
	assert.equal(res.headers.get("cache-control"), "public, max-age=60");
	assert.equal(res.headers.get("retry-after"), "30");
});
