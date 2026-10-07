import assert from "node:assert/strict";
import test from "node:test";
import { rankKey } from "./leaderboard";
import {
	apiSongId,
	applyAccAvgMap,
	applyAccRank,
	attachB19AccAvg,
	fetchAllSongAccAvg,
	rankLegend,
	rksAvgBand,
	rksAvgBandUp,
	type ScoreAvgSong,
} from "./score-avg";

function song(
	over: Partial<ScoreAvgSong> & Pick<ScoreAvgSong, "id" | "acc">,
): ScoreAvgSong {
	return { rank: "IN", ...over };
}

test("song ids sent to phib19 keep the .0 suffix", () => {
	assert.equal(apiSongId("Credits.Frums.0"), "Credits.Frums.0");
	assert.equal(apiSongId("Credits.Frums"), "Credits.Frums.0");
});

test("peer band is the ±0.05 rks window around computed rks", () => {
	assert.deepEqual(rksAvgBand(15.123), { minRks: 15.05, maxRks: 15.15 });
	assert.deepEqual(rksAvgBandUp(15.123), { minRks: 15.15, maxRks: 15.3 });
});

test("peer band never sends a negative minRks", () => {
	assert.deepEqual(rksAvgBand(0), { minRks: 0, maxRks: 0.05 });
	assert.deepEqual(rksAvgBand(Number.NaN), { minRks: 0, maxRks: 0.05 });
});

test("accAvg bar is Lower when below the same-rks peer average", () => {
	const row = song({ id: "Stasis.Maozon.0", acc: 97, rank: "AT" });
	const allHigher = applyAccAvgMap(
		[row],
		{ "Stasis.Maozon.0": { AT: { accAvg: 98.5, count: 10 } } },
		{ low: "Lower", high: "Higher", prefix: "Avg:" },
	);
	assert.equal(allHigher, false);
	assert.equal(row.accKind, "Lower");
	assert.equal(row.accAvg, "Avg: 98.5000%");
});

test("accAvg lookup works without a trailing .0 on the record id", () => {
	const row = song({ id: "Stasis.Maozon", acc: 99.9, rank: "IN" });
	applyAccAvgMap(
		[row],
		{ "Stasis.Maozon.0": { IN: { accAvg: 99.1, count: 3 } } },
		{ low: "Lower", high: "Higher", prefix: "Avg:" },
	);
	assert.equal(row.accKind, "Higher");
	assert.equal(row.accAvg, "Avg: 99.1000%");
});

test("all-higher first 27 skip overflow rows until the raised band", () => {
	const rows = Array.from({ length: 30 }, (_, i) =>
		song({ id: `s${i}.0`, acc: 100, rank: "IN" }),
	);
	const map = Object.fromEntries(
		rows.map((row) => [row.id, { IN: { accAvg: 99, count: 1 } }]),
	);
	const allHigher = applyAccAvgMap(rows, map, {
		low: "Lower",
		high: "Higher",
		prefix: "Avg:",
		stopAfter: 27,
	});
	assert.equal(allHigher, true);
	assert.equal(rows[26]?.accKind, "Higher");
	assert.equal(rows[27]?.accAvg, undefined);
});

test("LEGACY charts do not get a peer-average bar", () => {
	const row = song({ id: "old.0", acc: 90, rank: "LEGACY" });
	applyAccAvgMap(
		[row],
		{ "old.0": { LEGACY: { accAvg: 95, count: 1 } } },
		{ low: "Lower", high: "Higher", prefix: "Avg:" },
	);
	assert.equal(row.accAvg, undefined);
});

test("top mode writes both all and b30 percentiles", () => {
	const rows = [song({ id: "a.0", acc: 98, rank: "AT" })];
	applyAccRank(
		rows,
		{
			all: [{ topPercent: 2.1879 }],
			b30: [{ topPercent: 27.56 }],
		},
		"Hyper",
	);
	assert.equal(rows[0]?.accKind, "Hyper");
	assert.equal(rows[0]?.accAvg, "Top 2.19% / 27.56%");
});

test("attachB19AccAvg skips the network when avgType is none", async () => {
	let called = 0;
	const phi = [song({ id: "p.0", acc: 100, rank: "AT" })];
	const b19 = [song({ id: "b.0", acc: 99, rank: "IN" })];
	await attachB19AccAvg(
		{ phi, b19_list: b19, com_rks: 15.12 },
		{ avgType: "none" },
		{
			allAccAvg: async () => {
				called++;
				return {};
			},
		},
	);
	assert.equal(called, 0);
	assert.equal(b19[0]?.accAvg, undefined);
});

test("all mode fetches the peer band and labels phi plus b19", async () => {
	const calls: unknown[] = [];
	const phi = [song({ id: "PhiSong", acc: 100, rank: "AT" })];
	const b19 = [song({ id: "BestSong.0", acc: 97.2, rank: "IN" })];
	await attachB19AccAvg(
		{ phi, b19_list: b19, com_rks: 15.12 },
		{ avgType: "all" },
		{
			allAccAvg: async (params) => {
				calls.push(params);
				return {
					"PhiSong.0": { AT: { accAvg: 99.5, count: 4 } },
					"BestSong.0": { IN: { accAvg: 98.1, count: 8 } },
				};
			},
		},
	);
	assert.equal(calls.length, 1);
	assert.deepEqual(calls[0], {
		songIds: ["PhiSong.0", "BestSong.0"],
		...rksAvgBand(15.12),
	});
	assert.equal(phi[0]?.accKind, "Higher");
	assert.equal(phi[0]?.accAvg, "Avg: 99.5000%");
	assert.equal(b19[0]?.accKind, "Lower");
	assert.equal(b19[0]?.accAvg, "Avg: 98.1000%");
});

test("all-higher b19 refetches the raised rks band as Hyper/Finished", async () => {
	const bands: Array<{ minRks: number; maxRks: number }> = [];
	const b19 = [song({ id: "BestSong.0", acc: 100, rank: "IN" })];
	await attachB19AccAvg(
		{ phi: [], b19_list: b19, com_rks: 15.12 },
		{ avgType: "all" },
		{
			allAccAvg: async (params) => {
				bands.push({ minRks: params.minRks, maxRks: params.maxRks });
				return {
					"BestSong.0": {
						IN: {
							accAvg: bands.length === 1 ? 99.2 : 99.8,
							count: 2,
						},
					},
				};
			},
		},
	);
	assert.deepEqual(bands, [rksAvgBand(15.12), rksAvgBandUp(15.12)]);
	assert.equal(b19[0]?.accKind, "Finished");
	assert.equal(b19[0]?.accAvg, "Avg: 99.8000%");
});

test("b30 blue palette uses Hyper/Finished, red uses Lower/Higher", async () => {
	const map = {
		"BestSong.0": { IN: { accAvg: 99, count: 1 } },
	};
	const cool = [song({ id: "BestSong.0", acc: 98, rank: "IN" })];
	const warm = [song({ id: "BestSong.0", acc: 98, rank: "IN" })];
	await attachB19AccAvg(
		{ phi: [], b19_list: cool, com_rks: 15 },
		{ avgType: "b30", color: "blue" },
		{ allAccAvgB30: async () => map },
	);
	await attachB19AccAvg(
		{ phi: [], b19_list: warm, com_rks: 15 },
		{ avgType: "b30", color: "red" },
		{ allAccAvgB30: async () => map },
	);
	assert.equal(cool[0]?.accKind, "Hyper");
	assert.equal(cool[0]?.accAvg, "BAvg: 99.0000%");
	assert.equal(warm[0]?.accKind, "Lower");
});

test("fetch failures leave the card without avg bars", async () => {
	const b19 = [song({ id: "BestSong.0", acc: 98, rank: "IN" })];
	const res = await attachB19AccAvg(
		{ phi: [], b19_list: b19, com_rks: 15 },
		{ avgType: "all" },
		{
			allAccAvg: async () => {
				throw new Error("chart-tag 504");
			},
		},
	);
	assert.equal(b19[0]?.accAvg, undefined);
	assert.deepEqual(res, { partial: true });
});

test("fetchAllSongAccAvg POSTs the score-list path and unwraps data", async () => {
	const calls: { path: string; method?: string; body?: string }[] = [];
	const map = await fetchAllSongAccAvg(
		{ songIds: ["a.0"], minRks: 15, maxRks: 15.1 },
		async (path, init) => {
			calls.push({
				path,
				method: init?.method,
				body: typeof init?.body === "string" ? init.body : undefined,
			});
			return { data: { "a.0": { IN: { accAvg: 98, count: 1 } } } };
		},
	);
	assert.equal(calls[0]?.path, "/get/scoreList/allAccAvg");
	assert.equal(calls[0]?.method, "POST");
	assert.equal(map?.["a.0"]?.IN?.accAvg, 98);
});

test("phib19 HTTP-200 {error} bodies unwrap to null, not to data", async () => {
	const map = await fetchAllSongAccAvg(
		{ songIds: ["a.0"], minRks: 15, maxRks: 15.1 },
		async () => ({ error: "缺少 token api_user_id platform 参数" }),
	);
	assert.equal(map, null);
	assert.equal(
		await fetchAllSongAccAvg(
			{ songIds: ["a.0"], minRks: 15, maxRks: 15.1 },
			async () => ({ data: null }),
		),
		null,
	);
});

test("rank mode badges every row with its estimated place among phib19 records", async () => {
	const phi = [song({ id: "Ap.0", acc: 100, rank: "AT" })];
	const b19 = [
		song({ id: "Ap.0", acc: 100, rank: "AT" }),
		song({ id: "Mid.0", acc: 99.5, rank: "IN" }),
		song({ id: "Old.0", acc: 99, rank: "LEGACY" }),
		song({ id: "Gone.0", acc: 97, rank: "HD" }),
	];
	const asked: { songId: string; rank: string; acc: number }[] = [];
	const res = await attachB19AccAvg(
		{ phi, b19_list: b19, com_rks: 16 },
		{ avgType: "rank" },
		{
			rankRows: async (queries) => {
				asked.push(...queries);
				return {
					rows: new Map([
						[rankKey(queries[0]!), { better: 2032, total: 70387 }],
						[rankKey(queries[2]!), { better: 3610, total: 70387 }],
						// phib19 has no records on this chart
						[rankKey(queries[3]!), { better: 0, total: 0 }],
					]),
					partial: false,
				};
			},
		},
	);
	assert.deepEqual(res, { partial: false });
	// LEGACY rows are never asked about; phi and b19 rows both are
	assert.deepEqual(
		asked.map((q) => `${q.songId}:${q.rank}`),
		["Ap.0:AT", "Ap.0:AT", "Mid.0:IN", "Gone.0:HD"],
	);
	assert.equal(b19[1]?.accKind, "Rank");
	assert.equal(b19[1]?.accAvg, "#3,611 / 70,388 · Top 5.1%");
	assert.equal(b19[1]?.accRank?.pos, "#3,611");
	assert.equal(b19[1]?.accRank?.ap, false);
	// An AP is #1, tied with every AP record; its percent is the AP group's share,
	// labelled as such ("Top 2.9%" next to #1 would contradict it)
	assert.equal(phi[0]?.accRank?.pos, "#1");
	assert.equal(phi[0]?.accRank?.tied, 2032);
	assert.equal(phi[0]?.accRank?.ap, true);
	assert.equal(phi[0]?.accRank?.pct, "AP 2.9%");
	assert.equal(phi[0]?.accAvg, "#1 / 70,388 · AP 2.9%");
	assert.equal(b19[2]?.accAvg, undefined);
	// phib19 had no row for this one: no badge, but the card is complete
	assert.equal(b19[3]?.accAvg, undefined);
	assert.match(rankLegend("en"), /phib19\.top/);
	assert.match(rankLegend("zh"), /phib19\.top/);
});

test("a lookup past the render budget keeps the rows already in memory and marks the card partial", async () => {
	const b19 = [
		song({ id: "Slow.0", acc: 98, rank: "IN" }),
		song({ id: "Known.0", acc: 99.5, rank: "AT" }),
	];
	let late: (() => void) | undefined;
	const started = Date.now();
	const res = await attachB19AccAvg(
		{ phi: [], b19_list: b19, com_rks: 15 },
		{ avgType: "rank", budgetMs: 30 },
		{
			rankRows: (queries) =>
				new Promise((resolve) => {
					late = () =>
						resolve({
							rows: new Map([[rankKey(queries[0]!), { better: 9, total: 99 }]]),
							partial: false,
						});
				}),
			// A chunk that already landed (or an earlier render) answered this one
			peekRankRows: (queries) =>
				new Map([[rankKey(queries[1]!), { better: 3610, total: 70387 }]]),
		},
	);
	assert.deepEqual(res, { partial: true });
	assert.ok(Date.now() - started < 1000);
	assert.equal(b19[1]?.accAvg, "#3,611 / 70,388 · Top 5.1%");
	late?.();
	await new Promise((r) => setTimeout(r, 5));
	// The late answer fills caches only; the card being drawn is not touched
	assert.equal(b19[0]?.accAvg, undefined);
});

test("rank mode draws the rows that arrived and is partial when others are missing", async () => {
	const b19 = [
		song({ id: "A.0", acc: 98, rank: "IN" }),
		song({ id: "B.0", acc: 97, rank: "AT" }),
	];
	const res = await attachB19AccAvg(
		{ phi: [], b19_list: b19, com_rks: 15 },
		{ avgType: "rank" },
		{
			rankRows: async (queries) => ({
				rows: new Map([[rankKey(queries[0]!), { better: 9, total: 99 }]]),
				partial: true,
			}),
		},
	);
	assert.deepEqual(res, { partial: true });
	assert.equal(b19[0]?.accAvg, "#10 / 100 · Top 10.0%");
	assert.equal(b19[1]?.accAvg, undefined);
});

test("a mode the webui doesn't know (stored by the bot) draws no badges and is complete", async () => {
	const b19 = [song({ id: "A.0", acc: 98, rank: "IN" })];
	assert.deepEqual(
		await attachB19AccAvg(
			{ phi: [], b19_list: b19, com_rks: 15 },
			{ avgType: "median" },
		),
		{ partial: false },
	);
	assert.equal(b19[0]?.accAvg, undefined);
});

test("every avg mode reports partial when its lookup fails", async () => {
	const fail = async () => {
		throw new Error("chart-tag 503");
	};
	for (const avgType of ["all", "b30", "top", "rank"]) {
		const b19 = [song({ id: "X.0", acc: 98, rank: "IN" })];
		const res = await attachB19AccAvg(
			{ phi: [], b19_list: b19, com_rks: 15 },
			{ avgType },
			{
				allAccAvg: fail,
				allAccAvgB30: fail,
				allAccRank: fail,
				rankRows: fail,
				peekRankRows: () => new Map(),
			},
		);
		assert.deepEqual(res, { partial: true }, avgType);
		assert.equal(b19[0]?.accAvg, undefined, avgType);
	}
});
