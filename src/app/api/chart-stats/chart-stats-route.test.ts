import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { GET } from "./route";

beforeEach(() => setRequestLocaleForTest("en"));

afterEach(() => setRequestLocaleForTest());

test("an id with a path separator or a dot segment is a 400", async () => {
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	try {
		for (const id of ["..%2F..%2Fx", "..", "a%2Fb", "a%5Cb"]) {
			const res = await GET(
				new Request(`http://localhost/api/chart-stats?id=${id}&level=IN`),
			);
			assert.equal(res.status, 400, id);
		}
	} finally {
		process.env = env;
	}
});

test("a bad level or version is a 400", async () => {
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	try {
		for (const query of [
			"id=A.B.0&level=..%2FXX",
			"id=A.B.0&level=IN&ver=abc",
		]) {
			const res = await GET(
				new Request(`http://localhost/api/chart-stats?${query}`),
			);
			assert.equal(res.status, 400, query);
			const body = (await res.json()) as { code: string };
			assert.equal(body.code, "bad_request", query);
		}
	} finally {
		process.env = env;
	}
});
