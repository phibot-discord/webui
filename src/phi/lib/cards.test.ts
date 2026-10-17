import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// phib19 stand-in that is down (503); nothing here reaches the network or R2
const posts: string[] = [];
const server = createServer((req, res) => {
	posts.push(`${req.method} ${req.url}`);
	req.resume();
	res.writeHead(503, { "content-type": "application/json" });
	res.end('{"error":"down"}');
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.PHI_CHART_TAG_API = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
for (const k of [
	"CLOUDFLARE_R2_PUBLIC_BASE",
	"CLOUDFLARE_ACCOUNT_ID",
	"CLOUDFLARE_API_TOKEN",
]) {
	delete process.env[k];
}
const { b19Card, isPartialResult, lookupBudgetMs } = await import("./cards");
const {
	chartTagAnalysisKvKey,
	chartTagCacheId,
	parseB30TagAnalysis,
	resetChartTagVoteMemForTest,
} = await import("./chart-tags-api");
const { saveIdentity } = await import("./saves");
const { cardCopy } = await import("./card-i18n");

test.after(() => server.close());

type Row = { id: string; rank: string; rks: number };

const phiRows: Row[] = [
	{ id: "p1", rank: "IN", rks: 16.5 },
	{ id: "p2", rank: "AT", rks: 16.4 },
	{ id: "p3", rank: "IN", rks: 16.3 },
];
// 27 B slots, then 6 rows a 33-row card shows but RKS ignores
const bestRows: Row[] = [
	...Array.from({ length: 27 }, (_, i) => ({
		id: `b${i}`,
		rank: "IN",
		rks: 16.2 - i / 20,
	})),
	...Array.from({ length: 6 }, (_, i) => ({
		id: `x${i}`,
		rank: "EZ",
		rks: 4 + i,
	})),
];

function fakeSave(rev: string) {
	const copy = (rows: Row[]) => rows.map((row) => ({ ...row }));
	return {
		saveInfo: {
			gameFile: { url: `https://saves.example/${rev}` },
			modifiedAt: { iso: "2026-10-01T00:00:00.000Z" },
			summary: {
				challengeModeRank: 312,
				rankingScore: 16.1,
				updatedAt: "2026-10-01T00:00:00.000Z",
			},
			PlayerId: "Tester",
		},
		gameuser: { avatar: "Introduction", selfIntro: "", background: "" },
		gameProgress: { money: [0, 0, 0, 0, 0] },
		gameRecord: { b0: [null, null, { acc: 99, score: 990_000, fc: false }] },
		getB19() {
			return { phi: copy(phiRows), b19_list: copy(bestRows), com_rks: 16 };
		},
		async getBestWithLimit(_n: number, _limit: unknown, withPhi = true) {
			return {
				phi: withPhi ? copy(phiRows) : undefined,
				b19_list: copy(bestRows),
			};
		},
		async getStats() {
			return [];
		},
	};
}

const rt = {
	getInfo: {
		resources: "/nonexistent-phi-resources",
		idgetavatar: (a: unknown) => String(a),
		ori_info: {},
	},
	fCompute: {
		convertRichText: (s: unknown) => String(s ?? ""),
		formatDate: () => "2026/10/01",
		getBackground: async () => "",
		comJust1Good: () => true,
	},
};
const catalog = { randomIll: () => "", ill: () => undefined };

function memoryDb() {
	const store = new Map<string, string>();
	return {
		store,
		db: {
			async get(key: string) {
				return store.get(key);
			},
			async set(key: string, value: string) {
				store.set(key, value);
			},
			async del() {},
			async keys() {
				return [];
			},
		},
	};
}

const notes = {
	sign_in: "",
	sign_history: [],
	task_time: "",
	task: [],
	theme: "default",
	noticeCode: 0,
	b30AvgKind: "none" as const,
	b30AvgColor: "blue" as const,
	allowApiUsage: true,
	showB30Analysis: true,
	showTagAnalysis: true,
	showRecordStats: true,
	cardQuality: "fast" as const,
};

const pool = parseB30TagAnalysis({
	data: {
		threshold: 15.9,
		recordCount: 20,
		totalVotes: 499,
		minimumVotes: 30,
		averageRks: 16.19,
		categories: [],
		radar: { grids: [], axes: [], points: "", categories: [] },
		strong: [{ name: "长纵连", rks: 16.21, votes: 46, sampleCount: 8 }],
		weak: [{ name: "倒打", rks: 16.16, votes: 30, sampleCount: 5 }],
		insufficient: false,
	},
});

async function card(
	rev: string,
	mode: "b30" | "x30" | "fc30",
	opts: {
		cached?: boolean;
		tags?: boolean;
		locale?: "en" | "zh";
		peerWait?: boolean;
	} = {},
) {
	const save = fakeSave(rev);
	const { db } = memoryDb();
	if (opts.cached) {
		const id = chartTagCacheId(saveIdentity(save.saveInfo));
		await db.set(
			chartTagAnalysisKvKey(id),
			JSON.stringify({ at: Date.now(), analysis: pool }),
		);
	}
	return b19Card(rt as never, save as never, db, "u1", catalog as never, {
		nnum: 33,
		mode,
		locale: opts.locale ?? "en",
		showTagAnalysis: opts.tags ?? true,
		notes: opts.peerWait ? { ...notes, peerWait: true } : notes,
		...(opts.peerWait ? { peerDeadline: Date.now() + 50_000.5 } : {}),
	});
}

type Analysis = {
	histogram: { stddev: number; count: number };
	histogramPhiSlots: boolean;
	tagAnalysis: { threshold?: number } | null;
	tagMeta: string;
	tagPoolNote: string;
	tagMessage: string;
	tagLookupFailed: boolean;
};

test("a cached pool analysis renders the upstream meta line and is cacheable", async () => {
	resetChartTagVoteMemForTest();
	posts.length = 0;
	const data = await card("rev-ok", "b30", { cached: true, locale: "zh" });
	const analysis = data.b30Analysis as unknown as Analysis;
	assert.equal(posts.length, 0);
	assert.equal(data.renderPartial, false);
	assert.equal(analysis.tagMeta, "RKS≥15.9 · 成绩 20 · 选票 499");
	assert.equal(
		analysis.tagPoolNote,
		"统计全部单曲 RKS≥15.9 的成绩，而非 B30 槽位",
	);
	assert.equal(analysis.histogramPhiSlots, true);
	assert.equal(analysis.histogram.count, 30);
	assert.equal(data.rksStddev, analysis.histogram.stddev);
});

test("leaving P3 out of the SD drops only the P slots, in the header and the histogram alike", async () => {
	// The P charts also sit in B1–B3, as they do in a real save
	const listed = [...phiRows, ...bestRows.slice(0, 24), ...bestRows.slice(27)];
	const sd = (values: number[]) => {
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		return Math.sqrt(
			values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
		);
	};
	const run = async (stddevExcludeP3?: boolean) => {
		const save = fakeSave("rev-sd");
		save.getB19 = () => ({
			phi: phiRows.map((row) => ({ ...row })),
			b19_list: listed.map((row) => ({ ...row })),
			com_rks: 16,
		});
		const { db } = memoryDb();
		return b19Card(rt as never, save as never, db, "u1", catalog as never, {
			nnum: 33,
			mode: "b30",
			locale: "en",
			showTagAnalysis: false,
			stddevExcludeP3,
			notes,
		});
	};
	const p3 = phiRows.map((row) => row.rks);
	const b27 = listed.slice(0, 27).map((row) => row.rks);
	const all = await run();
	const without = await run(true);
	const analysis = (data: typeof all) =>
		data.b30Analysis as unknown as Analysis;
	assert.ok(Math.abs(all.rksStddev - sd([...p3, ...b27])) < 1e-12);
	// B1–B3 still count, though they are the P charts
	assert.ok(Math.abs(without.rksStddev - sd(b27)) < 1e-12);
	assert.equal(analysis(all).histogram.stddev, all.rksStddev);
	assert.equal(analysis(without).histogram.stddev, without.rksStddev);
	assert.notEqual(without.rksStddev, all.rksStddev);
	// The histogram still draws every slot
	assert.equal(analysis(without).histogram.count, 30);
});

test("a failed tag lookup renders 'No data' and marks the card partial", async () => {
	resetChartTagVoteMemForTest();
	posts.length = 0;
	const data = await card("rev-down", "b30");
	const analysis = data.b30Analysis as unknown as Analysis;
	assert.deepEqual(posts, ["POST /chartsTag/get/b30Analysis"]);
	assert.equal(analysis.tagLookupFailed, true);
	assert.equal(analysis.tagAnalysis, null);
	assert.equal(analysis.tagMeta, "No data");
	assert.equal(analysis.tagMessage, cardCopy("en").tagUnavailable);
	assert.equal(data.renderPartial, true);
});

test("Wait for every badge gives the tag lookup the time left until the peer deadline", () => {
	const floor = 8_000;
	const deadline = Date.now() + 50_000;
	const waiting = { ...notes, peerWait: true };
	assert.equal(lookupBudgetMs(notes, deadline, floor), floor);
	assert.equal(lookupBudgetMs(waiting, undefined, floor), floor);
	const budget = lookupBudgetMs(waiting, deadline, floor);
	assert.ok(budget > 49_000 && budget <= 50_000);
	assert.equal(lookupBudgetMs(waiting, Date.now() - 1, floor), floor);
});

test("after phib19 fails, only 'Wait for every badge' cards ask again", async () => {
	resetChartTagVoteMemForTest();
	posts.length = 0;
	await card("rev-trip", "b30");
	assert.equal(posts.length, 1);
	const skipped = await card("rev-skip", "b30");
	const analysis = skipped.b30Analysis as unknown as Analysis;
	assert.equal(posts.length, 1);
	assert.equal(analysis.tagLookupFailed, true);
	assert.equal(analysis.tagMeta, "No data");
	assert.equal(skipped.renderPartial, true);
	const cached = await card("rev-cached", "b30", { cached: true });
	assert.equal(posts.length, 1);
	assert.equal(cached.renderPartial, false);
	const waited = await card("rev-wait", "b30", { peerWait: true });
	assert.equal(posts.length, 2);
	assert.equal(waited.renderPartial, true);
});

test("x30/fc30 keep the histogram without P slots", async () => {
	resetChartTagVoteMemForTest();
	for (const mode of ["x30", "fc30"] as const) {
		const data = await card(`rev-${mode}`, mode, { cached: true });
		const analysis = data.b30Analysis as unknown as Analysis;
		assert.equal(analysis.histogramPhiSlots, false);
		assert.equal(analysis.histogram.count, 27);
		assert.equal(data.rksStddev, analysis.histogram.stddev);
		assert.equal(data.renderPartial, false);
	}
});

test("tags off: no lookup, insufficient copy, not partial", async () => {
	resetChartTagVoteMemForTest();
	posts.length = 0;
	const data = await card("rev-off", "b30", { tags: false });
	const analysis = data.b30Analysis as unknown as Analysis;
	assert.equal(posts.length, 0);
	assert.equal(analysis.tagLookupFailed, false);
	assert.equal(analysis.tagMessage, cardCopy("en").tagInsufficient);
	assert.equal(data.renderPartial, false);
});

test("peer-average results only mark the card partial when they say so", () => {
	assert.equal(isPartialResult({ partial: true }), true);
	assert.equal(isPartialResult({ partial: false }), false);
	assert.equal(isPartialResult({ phi: [], b19_list: [], com_rks: 16 }), false);
	assert.equal(isPartialResult(undefined), false);
});

test("rank badges draw no legend chip and keep the user's rows in KV", async () => {
	for (const locale of ["en", "zh"] as const) {
		const { db } = memoryDb();
		const reads: string[] = [];
		const get = db.get;
		db.get = async (key: string) => {
			reads.push(key);
			return get(key);
		};
		const data = await b19Card(
			rt as never,
			fakeSave(`rev-rank-${locale}`) as never,
			db,
			"u1",
			catalog as never,
			{
				nnum: 33,
				mode: "b30",
				locale,
				showTagAnalysis: false,
				notes: { ...notes, b30AvgKind: "rank" },
			},
		);
		assert.deepEqual(data.spInfo, []);
		assert.equal("rankLegend" in data, false);
		assert.deepEqual(data.missing, ["peers"]);
		assert.equal(data.renderPartial, true);
		assert.equal(typeof data.externalMs, "number");
		// Only the first card reads the user's row blob; the second finds phib19 paused
		if (locale === "en") {
			assert.ok(
				reads.includes("phi:lb:rank:v2:u1:all"),
				"the rank lookup got the KV handle and the owner",
			);
		}
	}
	const off = await b19Card(
		rt as never,
		fakeSave("rev-rank-off") as never,
		memoryDb().db,
		"u1",
		catalog as never,
		{
			nnum: 33,
			mode: "b30",
			locale: "en",
			showTagAnalysis: false,
			notes: { ...notes, b30AvgKind: "rank", allowApiUsage: false },
		},
	);
	assert.deepEqual(off.spInfo, []);
});
