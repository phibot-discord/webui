import assert from "node:assert/strict";
import test from "node:test";
import {
	CHART_TAG_TIMEOUT_MS,
	chartTagAgent,
	chartTagCacheId,
	chartTagHeaders,
	chartTagRemainMs,
	chartTagTreeR2Key,
	chartTagUrl,
	gameRecordPayload,
	isChartTagTimeout,
	isRetryableChartTagNet,
	loadChartTagTree,
	parseB30TagAnalysis,
	parseChartTagTree,
	resetChartTagTreeMemForTest,
	resetChartTagVoteMemForTest,
	tagAnalysisFor,
} from "./chart-tags-api";
import { kvKey, PHI_CHART_TAG_API } from "./const";

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

test("AbortSignal.timeout rejects fractional leftover ms from performance.now", () => {
	const remain = chartTagRemainMs(0, 0.00488699999);
	assert.equal(remain, 59_999);
	assert.doesNotThrow(() => AbortSignal.timeout(remain));
});

test("no-auth chart-tag routes keep GET vs POST", () => {
	assert.equal(PHI_CHART_TAG_API, "https://phi-ill-sync.ymyk.workers.dev");
	assert.equal(
		chartTagUrl("/chartsTag/get/tagTree"),
		"https://phi-ill-sync.ymyk.workers.dev/chartsTag/get/tagTree",
	);
	assert.equal(
		chartTagUrl("/chartsTag/get/b30Analysis"),
		"https://phi-ill-sync.ymyk.workers.dev/chartsTag/get/b30Analysis",
	);
	assert.equal(
		chartTagUrl("/get/scoreList/allAccAvg"),
		"https://phi-ill-sync.ymyk.workers.dev/get/scoreList/allAccAvg",
	);
	assert.equal(
		new URL(chartTagUrl("/x")).host,
		"phi-ill-sync.ymyk.workers.dev",
	);
	assert.notEqual(new URL(chartTagUrl("/x")).port, "8080");
});

test("isChartTagTimeout detects undici connect timeouts", () => {
	const err = new Error("Connect Timeout Error");
	err.name = "ConnectTimeoutError";
	(err as { code?: string }).code = "UND_ERR_CONNECT_TIMEOUT";
	assert.equal(isChartTagTimeout(err), true);
	assert.equal(isChartTagTimeout(new Error("nope")), false);
});

test("isRetryableChartTagNet retries kernel SYN deaths, not HTTP errors", () => {
	const timed = new TypeError("fetch failed");
	(timed as { cause?: unknown }).cause = Object.assign(new Error("connect"), {
		code: "ETIMEDOUT",
	});
	assert.equal(isRetryableChartTagNet(timed), true);
	assert.equal(isRetryableChartTagNet(new Error("chart-tag 502")), false);
});

test("isChartTagTimeout unwraps TypeError fetch failed causes", () => {
	const cause = new Error("This operation was aborted");
	cause.name = "TimeoutError";
	const err = new TypeError("fetch failed", { cause });
	assert.equal(isChartTagTimeout(err), true);
});

test("tag analysis POSTs b30Analysis with gameRecord arrays, not GET chartsTags", async () => {
	resetChartTagVoteMemForTest();
	const calls: { path: string; method?: string; body?: string }[] = [];
	await assert.rejects(
		() =>
			tagAnalysisFor(
				{
					gameRecord: {
						"Stasis.Maozon": [
							null,
							null,
							{ acc: 99, score: 980000, fc: false },
						],
					},
				},
				{
					saveRevision: "rev1",
					fetchJson: async (path, init) => {
						calls.push({
							path,
							method: init?.method,
							body: typeof init?.body === "string" ? init.body : undefined,
						});
						throw new TypeError("fetch failed");
					},
				},
			),
		TypeError,
	);
	assert.deepEqual(
		calls.map((c) => `${c.method ?? "GET"} ${c.path}`),
		["POST /chartsTag/get/b30Analysis"],
	);
	const sent = JSON.parse(calls[0]!.body!) as {
		gameRecord: Record<string, unknown>;
	};
	assert.deepEqual(sent.gameRecord["Stasis.Maozon.0"], [
		null,
		null,
		{ acc: 99, score: 980000, fc: false },
	]);
});

test("chart tag cache id follows save revision", () => {
	const a = chartTagCacheId("save-a");
	assert.equal(a, chartTagCacheId("save-a"));
	assert.notEqual(a, chartTagCacheId("save-b"));
	assert.equal(a.length, 24);
});

test("tag analysis is reused until the save revision changes", async () => {
	resetChartTagVoteMemForTest();
	const save = {
		gameRecord: {
			"a.0": [null, null, { acc: 100, score: 1_000_000, fc: true }],
		},
	};
	const analysis = parseB30TagAnalysis({
		data: {
			totalVotes: 40,
			minimumVotes: 30,
			averageRks: 15,
			insufficient: false,
			categories: [{ name: "读谱", rks: 15, votes: 4, hasVotes: true }],
			radar: {
				grids: ["1,2"],
				axes: [{ x: 100, y: 37 }],
				points: "100,37",
				categories: [
					{
						name: "读谱",
						rks: 15,
						votes: 4,
						hasVotes: true,
						displayRks: "15.00",
						pointX: 100,
						pointY: 64,
						labelX: 100,
						labelY: 14,
						anchor: "middle",
					},
				],
			},
			strong: [{ name: "差速", rks: 16, votes: 3, sampleCount: 2 }],
			weak: [],
		},
	});
	assert.ok(analysis);
	const store = new Map<string, string>();
	const db = {
		async get(key: string) {
			return store.get(key);
		},
		async set(key: string, value: string) {
			store.set(key, value);
		},
	};
	let fetches = 0;
	const fetchJson = async (path: string, init?: RequestInit) => {
		fetches += 1;
		assert.equal(path, "/chartsTag/get/b30Analysis");
		assert.equal(init?.method, "POST");
		return { data: analysis };
	};
	const first = await tagAnalysisFor(save, {
		fetchJson,
		saveRevision: "rev1",
		db,
	});
	const second = await tagAnalysisFor(save, {
		fetchJson,
		saveRevision: "rev1",
		db,
	});
	assert.equal(fetches, 1);
	assert.equal(first.totalVotes, 40);
	assert.deepEqual(first, second);
	assert.ok(store.has(kvKey("b30Analysis", chartTagCacheId("rev1"))));
	await tagAnalysisFor(save, {
		fetchJson,
		saveRevision: "rev2",
		db,
	});
	assert.equal(fetches, 2);
});

test("chart tag tree r2 key sits with the other info files", () => {
	assert.equal(chartTagTreeR2Key("info"), "info/tagTree.json");
});

test("parseChartTagTree keeps descriptions from phib19", () => {
	const tree = parseChartTagTree({
		data: [
			{
				name: "读谱",
				description: "读谱相关难点",
				children: [
					{
						name: "差速",
						description: "同一时刻的Note的下落速度不同",
						children: [],
					},
				],
			},
		],
	});
	assert.deepEqual(tree, [
		{
			name: "读谱",
			description: "读谱相关难点",
			voteCount: undefined,
			children: [
				{
					name: "差速",
					description: "同一时刻的Note的下落速度不同",
					voteCount: undefined,
					children: [],
				},
			],
		},
	]);
});

test("loadChartTagTree prefers the R2 snapshot and skips phib19", async () => {
	resetChartTagTreeMemForTest();
	let live = 0;
	const tree = await loadChartTagTree({
		getCached: async () => [{ name: "读谱", description: "读谱相关难点" }],
		fetchJson: async () => {
			live += 1;
			throw new TypeError("fetch failed");
		},
	});
	assert.equal(live, 0);
	assert.deepEqual(tree, [
		{
			name: "读谱",
			description: "读谱相关难点",
			voteCount: undefined,
			children: [],
		},
	]);
});

test("loadChartTagTree uses phib19 only when R2 is empty", async () => {
	resetChartTagTreeMemForTest();
	const tree = await loadChartTagTree({
		getCached: async () => undefined,
		fetchJson: async () => ({
			data: [{ name: "硬抗", description: "硬抗相关难点" }],
		}),
	});
	assert.equal(tree[0]?.name, "硬抗");
	assert.equal(tree[0]?.description, "硬抗相关难点");
});

test("failed chart tag analysis is not stored as a save cache hit", async () => {
	resetChartTagVoteMemForTest();
	const db = {
		async get() {
			return undefined;
		},
		async set() {
			throw new Error("cache should not write");
		},
	};
	await assert.rejects(
		() =>
			tagAnalysisFor(
				{
					gameRecord: {
						"a.0": [null, null, { acc: 100, score: 1e6, fc: true }],
					},
				},
				{
					saveRevision: "rev1",
					db,
					fetchJson: async () => {
						throw new TypeError("fetch failed");
					},
				},
			),
		TypeError,
	);
});

test("gameRecord payload is EZ/HD/IN arrays, not rank maps", () => {
	assert.deepEqual(
		gameRecordPayload({
			Credits: [
				null,
				{ acc: 98, score: 990000, fc: 1 },
				{ acc: 100, score: 1e6, fc: true },
			],
		}),
		{
			"Credits.0": [
				null,
				{ acc: 98, score: 990000, fc: true },
				{ acc: 100, score: 1e6, fc: true },
			],
		},
	);
});
