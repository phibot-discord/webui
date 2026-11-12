import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { keepLastPage, loadStatus, resetStatusMemoForTest } from "./status";

const BODY = { generatedAt: 1, targets: [], host: { series24h: [] } };

beforeEach(() => {
	resetStatusMemoForTest();
});

test("two loads within 30 s make one upstream call", async () => {
	let calls = 0;
	const stub = (async () => {
		calls += 1;
		return new Response(JSON.stringify(BODY), { status: 200 });
	}) as unknown as typeof fetch;
	const first = await loadStatus(stub);
	const second = await loadStatus(stub);
	assert.equal(calls, 1);
	assert.ok(first);
	assert.deepEqual(second, first);
});

test("a failed load is not remembered", async () => {
	let calls = 0;
	const stub = (async () => {
		calls += 1;
		if (calls === 1) return new Response("down", { status: 500 });
		return new Response(JSON.stringify(BODY), { status: 200 });
	}) as unknown as typeof fetch;
	assert.equal(await loadStatus(stub), null);
	const data = await loadStatus(stub);
	assert.ok(data);
	assert.equal(data.generatedAt, 1);
	assert.equal(calls, 2);
});

test("the source is read with a timeout and without the framework's cache options", async () => {
	let seen: { signal: AbortSignal } | undefined;
	const stub = async (_url: string, init: { signal: AbortSignal }) => {
		seen = init;
		return new Response(JSON.stringify(BODY), { status: 200 });
	};
	assert.ok(await loadStatus(stub));
	assert.ok(seen?.signal instanceof AbortSignal);
	assert.deepEqual(Object.keys(seen ?? {}), ["signal"]);
});

test("an unreachable source gives no data", async () => {
	const stub = async () => {
		throw new TypeError("fetch failed");
	};
	assert.equal(await loadStatus(stub), null);
});

test("a source that does not answer gives no data once the timeout passes", async () => {
	const stub = (_url: string, init: { signal: AbortSignal }) =>
		new Promise<Response>((_resolve, reject) => {
			init.signal.addEventListener("abort", () => reject(init.signal.reason));
		});
	const guard = new Promise<"hung">((resolve) => {
		setTimeout(() => resolve("hung"), 2000).unref();
	});
	assert.equal(await Promise.race([loadStatus(stub, 50), guard]), null);
});

test("only a running production server keeps the last page when the source fails", () => {
	assert.equal(keepLastPage({ NODE_ENV: "production" }), true);
	assert.equal(
		keepLastPage({
			NODE_ENV: "production",
			NEXT_PHASE: "phase-production-build",
		}),
		false,
	);
	assert.equal(keepLastPage({ NODE_ENV: "development" }), false);
	assert.equal(keepLastPage({}), false);
});
