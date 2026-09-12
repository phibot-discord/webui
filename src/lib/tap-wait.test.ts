import assert from "node:assert/strict";
import test from "node:test";
import {
	readJsonWithTapWait,
	tapWaitFailed,
	tapWaitHttpStatus,
} from "./tap-wait";

test("readJsonWithTapWait reports taptap phase then the final object", async () => {
	const body = `{"phase":"taptap"}\n${JSON.stringify({ ok: true, lastSynced: "x" })}\n`;
	const res = new Response(body, {
		headers: { "content-type": "application/x-ndjson; charset=utf-8" },
	});
	let notes = 0;
	const out = await readJsonWithTapWait(res, () => {
		notes += 1;
	});
	assert.equal(notes, 1);
	assert.equal(out.data.ok, true);
	assert.equal(out.data.lastSynced, "x");
	assert.equal(tapWaitFailed(res, out.data), false);
});

test("readJsonWithTapWait keeps JSON error responses", async () => {
	const res = new Response(
		JSON.stringify({ error: "unauthorized", code: "unauthorized" }),
		{
			status: 401,
			headers: { "content-type": "application/json" },
		},
	);
	let notes = 0;
	const out = await readJsonWithTapWait(res, () => {
		notes += 1;
	});
	assert.equal(notes, 0);
	assert.equal(out.httpStatus, 401);
	assert.equal(tapWaitFailed(res, out.data), true);
});

test("tapWaitHttpStatus prefers numeric payload status", () => {
	assert.equal(
		tapWaitHttpStatus(
			{ status: 200 },
			{ status: 429, code: "refresh_cooldown" },
		),
		429,
	);
	assert.equal(tapWaitHttpStatus({ status: 200 }, { status: "bound" }), 200);
});
