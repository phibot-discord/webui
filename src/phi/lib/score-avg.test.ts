import assert from "node:assert/strict";
import test from "node:test";
import {
	apiSongId,
	applyAccAvgMap,
	applyAccRank,
	attachB19AccAvg,
	fetchAllSongAccAvg,
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
	await attachB19AccAvg(
		{ phi: [], b19_list: b19, com_rks: 15 },
		{ avgType: "all" },
		{
			allAccAvg: async () => {
				throw new Error("chart-tag 504");
			},
		},
	);
	assert.equal(b19[0]?.accAvg, undefined);
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
