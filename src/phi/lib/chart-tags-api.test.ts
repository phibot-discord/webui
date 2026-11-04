import assert from "node:assert/strict";
import test from "node:test";
import {
	CHART_TAG_BACKGROUND_MS,
	CHART_TAG_TIMEOUT_MS,
	chartTagAgent,
	chartTagHeaders,
	chartTagUrl,
	isChartTagTimeout,
	loadChartTagTree,
	withChartTagBudget,
} from "./chart-tags-api";
import { parseTagVotes } from "./chart-tag-votes";
import { PHI_CHART_TAG_API } from "./const";

test("proxy key goes to the Worker, never to phib19 itself", () => {
	const key = "shared-secret";
	assert.equal(
		chartTagHeaders("https://phi-ill-sync.example.workers.dev", key)[
			"x-phi-proxy-key"
		],
		key,
	);
	assert.equal(
		"x-phi-proxy-key" in chartTagHeaders("https://phib19.top:8080", key),
		false,
	);
	assert.equal(
		"x-phi-proxy-key" in
			chartTagHeaders("https://phi-ill-sync.example.workers.dev", ""),
		false,
	);
	assert.equal(
		chartTagHeaders("https://phib19.top:8080", key).Accept,
		"application/json",
	);
});

test("phib19 timeout is 60s including TCP connect, not AbortSignal alone", () => {
	assert.equal(CHART_TAG_TIMEOUT_MS, 60_000);
	assert.equal(chartTagAgent.connectTimeout, 60_000);
	assert.equal(chartTagAgent.connect.timeout, 60_000);
});

test("phib19 routes go through the Worker", () => {
	assert.equal(PHI_CHART_TAG_API, "https://sync.phibot.dev");
	assert.equal(
		chartTagUrl("/get/scoreList/allAccAvg"),
		"https://sync.phibot.dev/get/scoreList/allAccAvg",
	);
	assert.equal(new URL(chartTagUrl("/x")).host, "sync.phibot.dev");
	assert.notEqual(new URL(chartTagUrl("/x")).port, "8080");
});

test("isChartTagTimeout detects undici connect timeouts", () => {
	const err = new Error("Connect Timeout Error");
	err.name = "ConnectTimeoutError";
	(err as { code?: string }).code = "UND_ERR_CONNECT_TIMEOUT";
	assert.equal(isChartTagTimeout(err), true);
	assert.equal(isChartTagTimeout(new Error("nope")), false);
});

test("isChartTagTimeout unwraps TypeError fetch failed causes", () => {
	const cause = new Error("This operation was aborted");
	cause.name = "TimeoutError";
	const err = new TypeError("fetch failed", { cause });
	assert.equal(isChartTagTimeout(err), true);
});

test("budget passes answers and errors through untouched", async () => {
	assert.equal(await withChartTagBudget(Promise.resolve(5), 50, "x"), 5);
	await assert.rejects(
		withChartTagBudget(Promise.reject(new Error("chart-tag 502")), 50, "x"),
		/chart-tag 502/,
	);
	assert.ok(CHART_TAG_BACKGROUND_MS >= 25_000);
});

test("budget gives up early and reports a timeout", async () => {
	const never = new Promise<number>(() => {});
	await assert.rejects(withChartTagBudget(never, 10, "x"), (err) =>
		isChartTagTimeout(err),
	);
});

test("the /tags glossary comes from the kyou snapshot, with descriptions", async () => {
	const votes = parseTagVotes({
		sha: "s",
		tree: [
			{
				id: 152,
				name: "读谱",
				description: "读谱相关难点",
				children: [{ id: 156, name: "差速", description: "同一时刻…" }],
			},
		],
		charts: {},
	});
	assert.deepEqual(await loadChartTagTree({ load: async () => votes }), [
		{
			name: "读谱",
			description: "读谱相关难点",
			children: [{ name: "差速", description: "同一时刻…", children: [] }],
		},
	]);
	assert.deepEqual(await loadChartTagTree({ load: async () => undefined }), []);
});
