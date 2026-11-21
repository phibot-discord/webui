import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { rateLimitBy, resetRateLimitForTest } from "@/server/rate-limit";
import { GET } from "./route";

const env = { ...process.env };

beforeEach(() => {
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
	process.env.CLOUDFLARE_R2_BUCKET = "off";
});

afterEach(() => {
	setRequestLocaleForTest();
	process.env = { ...env };
});

function ask(query: string, ip = "203.0.113.40") {
	return GET(
		new Request(`http://localhost/api/search?${query}`, {
			headers: { "x-forwarded-for": ip },
		}),
	);
}

test("a query shorter than two characters is an empty answer that may be cached", async () => {
	for (const query of ["", "q=", "q=a", "q=%20%20b%20", "q=a&locale=zh"]) {
		const res = await ask(query);
		assert.equal(res.status, 200, query);
		assert.deepEqual(await res.json(), { q: "", groups: [] }, query);
		assert.match(
			res.headers.get("cache-control") ?? "",
			/^public, max-age=300/,
		);
	}
});

test("a query longer than 64 characters is refused", async () => {
	const res = await ask(`q=${"a".repeat(65)}`);
	assert.equal(res.status, 400);
	assert.equal(((await res.json()) as { code: string }).code, "bad_request");
	assert.equal(res.headers.get("cache-control"), "no-store");
});

test("an answer names its query and lists its groups, and edge and browser may keep it", async () => {
	for (const query of [
		"q=%20alpa%20%20pen%20&locale=ja",
		"q=alpa+pen&locale=xx",
		"q=alpa%20pen",
	]) {
		const res = await ask(query);
		assert.equal(res.status, 200, query);
		assert.deepEqual(await res.json(), { q: "alpa pen", groups: [] }, query);
		assert.equal(
			res.headers.get("cache-control"),
			"public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
		);
		assert.equal(res.headers.get("set-cookie"), null);
	}
	const one = await ask("q=%E5%A1%94");
	assert.deepEqual(await one.json(), { q: "塔", groups: [] });
});

test("a full search bucket refuses the address before any work", async () => {
	for (let i = 0; i < 60; i++) rateLimitBy("search:203.0.113.41", 60);
	const res = await ask("q=alpa", "203.0.113.41");
	assert.equal(res.status, 429);
	const body = (await res.json()) as { code: string };
	assert.equal(body.code, "rate_limit");
	assert.ok(Number(res.headers.get("retry-after")) >= 1);
	const other = await ask("q=alpa", "203.0.113.42");
	assert.equal(other.status, 200);
});
