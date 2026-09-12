import assert from "node:assert/strict";
import test from "node:test";
import {
	CHART_TAG_TIMEOUT_MS,
	ChartTagTimeoutError,
	chartTagCacheId,
	chartTagUrl,
	isChartTagTimeout,
	loadChartTagVotes,
	resetChartTagVoteMemForTest,
} from "./chart-tags-api";
import { kvKey, PHI_CHART_TAG_API } from "./const";

test("phib19 timeout is 30s including TCP connect, not AbortSignal alone", () => {
	assert.equal(CHART_TAG_TIMEOUT_MS, 30_000);
});

test("chart tag requests target phib19.top:8080", () => {
	assert.equal(PHI_CHART_TAG_API, "https://phib19.top:8080");
	assert.equal(
		chartTagUrl("/chartsTag/get/tagTree"),
		"https://phib19.top:8080/chartsTag/get/tagTree",
	);
	assert.equal(new URL(chartTagUrl("/x")).host, "phib19.top:8080");
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

test("chart tag batch failure does not fan out to bySongRank", async () => {
	const paths: string[] = [];
	await assert.rejects(
		() =>
			loadChartTagVotes([{ id: "a.0", rank: "IN" }], {
				fetchJson: async (path) => {
					paths.push(path);
					throw new TypeError("fetch failed");
				},
			}),
		(err: unknown) => err instanceof TypeError,
	);
	assert.deepEqual(paths, ["/chartsTag/get/chartsTags"]);
});

test("chart tag cache id follows save revision and requested charts", () => {
	const rec = [
		{ id: "b.0", rank: "AT" },
		{ id: "a.0", rank: "IN" },
	];
	const a = chartTagCacheId("save-a", rec);
	assert.equal(a, chartTagCacheId("save-a", [...rec].reverse()));
	assert.notEqual(a, chartTagCacheId("save-b", rec));
	assert.notEqual(a, chartTagCacheId("save-a", rec.slice(0, 1)));
	assert.equal(a.length, 24);
});

test("chart tag votes are reused until the save revision changes", async () => {
	resetChartTagVoteMemForTest();
	const rec = [{ id: "a.0", rank: "IN" }];
	const votes = { "a.0": { IN: { 读谱: 3 } } };
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
	const fetchJson = async () => {
		fetches += 1;
		return { data: votes };
	};
	const first = await loadChartTagVotes(rec, {
		fetchJson,
		saveRevision: "rev1",
		db,
	});
	const second = await loadChartTagVotes(rec, {
		fetchJson,
		saveRevision: "rev1",
		db,
	});
	assert.equal(fetches, 1);
	assert.deepEqual(first, second);
	assert.ok(store.has(kvKey("chartTags", chartTagCacheId("rev1", rec))));
	await loadChartTagVotes(rec, {
		fetchJson,
		saveRevision: "rev2",
		db,
	});
	assert.equal(fetches, 2);
});

test("failed chart tag fetch is not stored as a save cache hit", async () => {
	resetChartTagVoteMemForTest();
	const rec = [{ id: "a.0", rank: "IN" }];
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
			loadChartTagVotes(rec, {
				saveRevision: "rev1",
				db,
				fetchJson: async () => {
					throw new ChartTagTimeoutError();
				},
			}),
		ChartTagTimeoutError,
	);
});
