import assert from "node:assert/strict";
import test from "node:test";
import {
	TAPAPI_TIMEOUT_MS,
	isTimeoutError,
	setTapHttpForTest,
	tapAgent,
	tapFetch,
	withTapWait,
} from "./tapapi";

test("TapTap cloud waits 30s including TCP connect", () => {
	assert.equal(TAPAPI_TIMEOUT_MS, 30_000);
	assert.equal(tapAgent.connectTimeout, 30_000);
});

test("undici connect timeout is a TapAPI timeout", () => {
	const cause = new Error("Connect Timeout Error");
	cause.name = "ConnectTimeoutError";
	(cause as { code?: string }).code = "UND_ERR_CONNECT_TIMEOUT";
	assert.equal(isTimeoutError(new TypeError("fetch failed", { cause })), true);
});

test("withTapWait notifies once on the first TapTap fetch", async () => {
	let fetches = 0;
	setTapHttpForTest(async () => {
		fetches += 1;
		return new Response("{}", { status: 200 });
	});
	try {
		let notes = 0;
		await withTapWait(
			() => {
				notes += 1;
			},
			async () => {
				await tapFetch("https://example.test/a");
				await tapFetch("https://example.test/b");
			},
		);
		assert.equal(fetches, 2);
		assert.equal(notes, 1);
	} finally {
		setTapHttpForTest();
	}
});

test("withTapWait stays quiet when TapTap is not contacted", async () => {
	let notes = 0;
	await withTapWait(
		() => {
			notes += 1;
		},
		async () => "local",
	);
	assert.equal(notes, 0);
});

test("tapFetch without withTapWait still works", async () => {
	setTapHttpForTest(async () => new Response("{}", { status: 200 }));
	try {
		const res = await tapFetch("https://example.test/plain");
		assert.equal(res.status, 200);
	} finally {
		setTapHttpForTest();
	}
});
