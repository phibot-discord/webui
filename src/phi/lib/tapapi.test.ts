import assert from "node:assert/strict";
import test from "node:test";
import { tapFetch, withTapWait } from "./tapapi";

test("withTapWait notifies once on the first TapTap fetch", async () => {
	const orig = globalThis.fetch;
	let fetches = 0;
	globalThis.fetch = (async () => {
		fetches += 1;
		return new Response("{}", { status: 200 });
	}) as typeof fetch;
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
		globalThis.fetch = orig;
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
	const orig = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("{}", { status: 200 })) as typeof fetch;
	try {
		const res = await tapFetch("https://example.test/plain");
		assert.equal(res.status, 200);
	} finally {
		globalThis.fetch = orig;
	}
});
