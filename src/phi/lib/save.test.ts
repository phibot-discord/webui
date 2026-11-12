import assert from "node:assert/strict";
import test from "node:test";
import type { LevelKind } from "./const";
import { fCompute } from "./fcompute";
import { getInfo } from "./get-info";
import { rankingScoreOf } from "./manual-score";
import { Save, type SavePayload } from "./save";
import { type SimBaseRecord, simulate } from "./simulation";
import { headerRks, roundUp, targetsFor } from "./targets";

function payload(rks: number, clg = 0): SavePayload {
	return {
		session: "token",
		saveInfo: {
			PlayerId: "1",
			modifiedAt: { iso: new Date(0) },
			summary: { rankingScore: rks, challengeModeRank: clg },
		},
		gameRecord: {},
	} as SavePayload;
}

type Rank = "EZ" | "HD" | "IN" | "AT";
type Chart = [id: string, rank: Rank, difficulty: number];
type Play = [id: string, rank: Rank, acc: number];

const RANKS: Rank[] = ["EZ", "HD", "IN", "AT"];

function withCatalog(charts: Chart[], run: () => void) {
	const prevInfo = getInfo.ori_info;
	const prevSongs = getInfo.songsid;
	getInfo.ori_info = {};
	getInfo.songsid = {};
	for (const [id, rank, difficulty] of charts) {
		const song = id.split(".")[0] ?? id;
		const info = getInfo.ori_info[id] ?? { id, song, chart: {} };
		info.chart[rank] = { id, rank, charter: "", difficulty };
		getInfo.ori_info[id] = info;
		getInfo.songsid[id] = song;
	}
	try {
		run();
	} finally {
		getInfo.ori_info = prevInfo;
		getInfo.songsid = prevSongs;
	}
}

type TotalsCache = { totals: [number, number, number, number] | undefined };

async function withCatalogAsync(charts: Chart[], run: () => Promise<void>) {
	const cache = getInfo as unknown as TotalsCache;
	const prevInfo = getInfo.ori_info;
	const prevSongs = getInfo.songsid;
	const prevTotals = cache.totals;
	getInfo.ori_info = {};
	getInfo.songsid = {};
	cache.totals = undefined;
	for (const [id, rank, difficulty] of charts) {
		const song = id.split(".")[0] ?? id;
		const info = getInfo.ori_info[id] ?? { id, song, chart: {} };
		info.chart[rank] = { id, rank, charter: "", difficulty };
		getInfo.ori_info[id] = info;
		getInfo.songsid[id] = song;
	}
	try {
		await run();
	} finally {
		getInfo.ori_info = prevInfo;
		getInfo.songsid = prevSongs;
		cache.totals = prevTotals;
	}
}

function listed(
	rows: readonly { id: string; num?: number | string; suggest?: string }[],
) {
	return rows.map((r) => [r.id, r.num, r.suggest]);
}

function seeded(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 2 ** 32;
	};
}

function randomPlays(seed: number, n: number) {
	const rnd = seeded(seed);
	const charts: Chart[] = [];
	const plays: Play[] = [];
	for (let i = 0; i < n; i++) {
		const id = `Song${i}.Maker.0`;
		const rank = RANKS[i % 4] ?? "IN";
		const difficulty = Math.round((1 + rnd() * 16.5) * 10) / 10;
		const acc =
			rnd() < 0.1 ? 100 : Math.round((65 + rnd() * 34.99) * 1e4) / 1e4;
		charts.push([id, rank, difficulty]);
		plays.push([id, rank, acc]);
	}
	return { charts, plays };
}

const SAVES: readonly (readonly [seed: number, n: number])[] = [
	[21, 25],
	[22, 30],
	[23, 40],
	[24, 50],
	[25, 60],
];

function exampleCharts(pc: number): Chart[] {
	return [
		["PA.p.0", "IN", 16],
		["PB.p.0", "IN", 15.5],
		["PC.p.0", "IN", pc],
		["T.t.0", "IN", 15],
		["F.f.0", "IN", 10],
	];
}

function examplePlays(f: number): Play[] {
	return [
		["PA.p.0", "IN", 100],
		["PB.p.0", "IN", 100],
		["PC.p.0", "IN", 100],
		["T.t.0", "IN", 99.9],
		["F.f.0", "IN", f],
	];
}

const listCharts: Chart[] = [
	["A.a.0", "IN", 15],
	["B.b.0", "IN", 14],
	["C.c.0", "IN", 13],
	["D.d.0", "IN", 12],
];

const listPlays: Play[] = [
	["A.a.0", "IN", 100],
	["B.b.0", "IN", 99],
	["Unk.u.0", "IN", 98],
	["C.c.0", "IN", 95],
	["D.d.0", "IN", 80],
];

function scoredPayload(plays: Play[]): SavePayload {
	const data = payload(15);
	const gameRecord: NonNullable<SavePayload["gameRecord"]> = {};
	for (const [id, rank, acc] of plays) {
		const rows = gameRecord[id] ?? [];
		rows[RANKS.indexOf(rank)] = {
			acc,
			score: acc === 100 ? 1_000_000 : Math.round(acc * 9_000),
			fc: acc === 100,
		};
		gameRecord[id] = rows;
	}
	data.gameRecord = gameRecord;
	return data;
}

function sumOfBest(values: number[], count: number) {
	return [...values]
		.sort((a, b) => b - a)
		.slice(0, count)
		.reduce((sum, v) => sum + v, 0);
}

function expectedTotal(charts: Chart[], plays: Play[]) {
	const rated = plays.map(([id, rank, acc]) => {
		const chart = charts.find(([c, r]) => c === id && r === rank);
		return { acc, rks: fCompute.rks(acc, chart?.[2] ?? 0) };
	});
	const perfect = rated.filter((r) => r.acc === 100).map((r) => r.rks);
	const all = rated.map((r) => r.rks);
	return (sumOfBest(perfect, 3) + sumOfBest(all, 27)) / 30;
}

test("an RKS under the catalog max is accepted", () => {
	const prev = getInfo.MAX_DIFFICULTY;
	getInfo.MAX_DIFFICULTY = 17.9;
	try {
		const save = new Save(payload(17.7));
		assert.equal(save.saveInfo.summary.rankingScore, 17.7);
		assert.throws(() => new Save(payload(18)), /rks异常/);
	} finally {
		getInfo.MAX_DIFFICULTY = prev;
	}
});

test("the challenge level cap follows the highest catalog level", () => {
	const prev = getInfo.MAX_DIFFICULTY;
	try {
		getInfo.MAX_DIFFICULTY = 18;
		assert.equal(
			new Save(payload(16, 252)).saveInfo.summary.challengeModeRank,
			252,
		);
		assert.throws(() => new Save(payload(16, 255)), /rks异常/);
		getInfo.MAX_DIFFICULTY = 17.9;
		assert.throws(() => new Save(payload(16, 252)), /rks异常/);
		getInfo.MAX_DIFFICULTY = 0;
		assert.equal(
			new Save(payload(16, 351)).saveInfo.summary.challengeModeRank,
			351,
		);
		assert.throws(() => new Save(payload(16, 352)), /rks异常/);
	} finally {
		getInfo.MAX_DIFFICULTY = prev;
	}
});

test("a rejected save never names its session token in the error", () => {
	const prev = getInfo.MAX_DIFFICULTY;
	const session = "Tk9aB3cD4eF5gH6iJ7kL8mN9p";
	const data = payload(18);
	data.session = session;
	try {
		getInfo.MAX_DIFFICULTY = 17.9;
		assert.throws(
			() => new Save(data),
			(err: Error) => {
				assert.match(err.message, /rks异常/);
				assert.equal(err.message.includes(session), false, err.message);
				return true;
			},
		);
	} finally {
		getInfo.MAX_DIFFICULTY = prev;
	}
});

test("the total is the three best all-perfects plus the best 27, over 30", () => {
	const charts: Chart[] = [
		["Aurora.Ann.0", "IN", 15.8],
		["Aurora.Ann.0", "AT", 16.4],
		["Breeze.Bo.0", "IN", 15.2],
		["Cinder.Cy.0", "HD", 9.5],
		["Cinder.Cy.0", "IN", 14.9],
		["Dune.Di.0", "IN", 14.9],
		["Ember.Ed.0", "IN", 13.7],
		["Frost.Fa.0", "IN", 12.4],
		["Gale.Gu.0", "IN", 12.4],
	];
	const plays: Play[] = [
		["Aurora.Ann.0", "AT", 98.5],
		["Aurora.Ann.0", "IN", 100],
		["Breeze.Bo.0", "IN", 100],
		["Cinder.Cy.0", "HD", 100],
		["Cinder.Cy.0", "IN", 99.2],
		["Dune.Di.0", "IN", 100],
		["Ember.Ed.0", "IN", 96.4],
		["Frost.Fa.0", "IN", 100],
		["Gale.Gu.0", "IN", 72],
	];
	withCatalog(charts, () => {
		const { com_rks } = new Save(scoredPayload(plays)).getB19(27);
		const expected = expectedTotal(charts, plays);
		assert.ok(Math.abs(com_rks - expected) < 1e-9, `${com_rks} ${expected}`);
	});
});

test("no all-perfect score gives three empty phi slots", () => {
	const charts = Array.from(
		{ length: 30 },
		(_, n): Chart => [`Song${n}.Maker.0`, "IN", 10 + n / 10],
	);
	const plays = charts.map(([id, rank], n): Play => [id, rank, 90 + (n % 9)]);
	withCatalog(charts, () => {
		const { phi, com_rks } = new Save(scoredPayload(plays)).getB19(33);
		assert.deepEqual(phi, [undefined, undefined, undefined]);
		const expected = expectedTotal(charts, plays);
		assert.ok(Math.abs(com_rks - expected) < 1e-9, `${com_rks} ${expected}`);
	});
});

test("tied all-perfects are chosen the same way every time", () => {
	const charts: Chart[] = [
		["Alpha.Al.0", "IN", 16],
		["Bravo.Br.0", "IN", 15],
		["Delta.De.0", "IN", 14],
		["Echo.Ec.0", "IN", 14],
		["Charlie.Ch.0", "IN", 14],
		["Foxtrot.Fo.0", "IN", 13],
	];
	const plays = charts.map(([id, rank]): Play => [id, rank, 100]);
	withCatalog(charts, () => {
		const data = scoredPayload(plays);
		const picks = Array.from({ length: 20 }, () =>
			new Save(structuredClone(data))
				.getB19(27)
				.phi.map((r) => `${r?.id} ${r?.rank}`),
		);
		for (const pick of picks) assert.deepEqual(pick, picks[0]);
		assert.deepEqual(picks[0], [
			"Alpha.Al.0 IN",
			"Bravo.Br.0 IN",
			"Charlie.Ch.0 IN",
		]);
	});
});

test("with no limit the limited list is getB19's list without unrated rows or colour tiers", async () => {
	await withCatalogAsync(listCharts, async () => {
		const limited = await new Save(scoredPayload(listPlays)).getBestWithLimit(
			33,
			[],
		);
		assert.equal(limited.phi?.length, 3);
		assert.equal(limited.phi?.[0]?.id, "A.a.0");
		assert.equal(limited.phi?.[0]?.suggest, "无法推分");
		assert.equal(limited.phi?.[1], undefined);
		assert.equal(limited.phi?.[2], undefined);
		assert.deepEqual(listed(limited.b19_list), [
			["A.a.0", 1, "无法推分"],
			["B.b.0", 2, "99.1477%"],
			["C.c.0", 3, "95.1749%"],
			["D.d.0", 4, "80.3020%"],
		]);
		assert.deepEqual(
			limited.b19_list.map((r) => r.suggestType),
			[undefined, undefined, undefined, undefined],
		);
		assert.ok(Math.abs(limited.com_rks - 1.912) < 1e-9, `${limited.com_rks}`);
		const full = new Save(scoredPayload(listPlays)).getB19(33);
		assert.deepEqual(listed(full.b19_list), [
			["A.a.0", 1, "无法推分"],
			["B.b.0", 2, "99.1477%"],
			["C.c.0", 3, "95.1749%"],
			["D.d.0", 4, "80.3020%"],
			["Unk.u.0", 5, "无法推分"],
		]);
		assert.deepEqual(
			full.b19_list.map((r) => r.suggestType),
			[undefined, 2, 0, 0, undefined],
		);
		assert.ok(Math.abs(full.com_rks - 1.912) < 1e-9, `${full.com_rks}`);
	});
});

test("an accuracy limit keeps the rows inside the range, both ends included", async () => {
	await withCatalogAsync(listCharts, async () => {
		const { phi, b19_list, com_rks } = await new Save(
			scoredPayload(listPlays),
		).getBestWithLimit(33, [{ type: "acc", value: [95, 100] }]);
		assert.deepEqual(
			phi?.map((r) => r?.id),
			["A.a.0", undefined, undefined],
		);
		assert.deepEqual(
			b19_list.map((r) => r.id),
			["A.a.0", "B.b.0", "C.c.0"],
		);
		assert.deepEqual(
			b19_list.map((r) => r.num),
			[1, 2, 3],
		);
		assert.ok(Math.abs(com_rks - 1.788543209876543) < 1e-9, `${com_rks}`);
	});
});

test("the row count caps both the limited list and its total", async () => {
	await withCatalogAsync(listCharts, async () => {
		const { b19_list, com_rks } = await new Save(
			scoredPayload(listPlays),
		).getBestWithLimit(2, []);
		assert.deepEqual(
			b19_list.map((r) => r.id),
			["A.a.0", "B.b.0"],
		);
		assert.ok(Math.abs(com_rks - 1.446156378600823) < 1e-9, `${com_rks}`);
	});
});

test("a row that passes the limit but has no rating is left out", async () => {
	await withCatalogAsync(listCharts, async () => {
		const { b19_list, com_rks } = await new Save(
			scoredPayload(listPlays),
		).getBestWithLimit(33, [{ type: "score", value: [880000, 1_000_000] }]);
		assert.deepEqual(
			b19_list.map((r) => r.id),
			["A.a.0", "B.b.0"],
		);
		assert.ok(Math.abs(com_rks - 1.446156378600823) < 1e-9, `${com_rks}`);
	});
});

test("without phi slots the phi list is undefined and the best 30 are summed", async () => {
	await withCatalogAsync(listCharts, async () => {
		const result = await new Save(scoredPayload(listPlays)).getBestWithLimit(
			33,
			[{ type: "rks", value: [0, 14] }],
			false,
		);
		assert.equal("phi" in result, true);
		assert.equal(result.phi, undefined);
		assert.deepEqual(
			result.b19_list.map((r) => r.id),
			["B.b.0", "C.c.0", "D.d.0"],
		);
		assert.deepEqual(
			result.b19_list.map((r) => r.num),
			[1, 2, 3],
		);
		assert.ok(Math.abs(result.com_rks - 0.912) < 1e-9, `${result.com_rks}`);
	});
});

test("without phi slots the limited list asks for the same accuracy as getB19", async () => {
	const charts: Chart[] = [
		["N.n.0", "IN", 15],
		["M.m.0", "IN", 14],
	];
	const plays: Play[] = [
		["N.n.0", "IN", 99.99],
		["M.m.0", "IN", 90],
	];
	await withCatalogAsync(charts, async () => {
		const limited = await new Save(scoredPayload(plays)).getBestWithLimit(
			33,
			[],
			false,
		);
		assert.deepEqual(listed(limited.b19_list), [
			["N.n.0", 1, "100.0000%"],
			["M.m.0", 2, "90.1805%"],
		]);
		assert.ok(
			Math.abs(limited.com_rks - 0.7820823292181068) < 1e-9,
			`${limited.com_rks}`,
		);
		const full = new Save(scoredPayload(plays)).getB19(33);
		assert.deepEqual(listed(full.b19_list), [
			["N.n.0", 1, "100.0000%"],
			["M.m.0", 2, "90.1805%"],
		]);
		assert.deepEqual(
			full.b19_list.map((r) => r.suggestType),
			[5, 0],
		);
	});
});

test("a limited call leaves the save's own record list filtered", async () => {
	await withCatalogAsync(listCharts, async () => {
		const save = new Save(scoredPayload(listPlays));
		await save.getBestWithLimit(33, [{ type: "acc", value: [95, 100] }]);
		assert.deepEqual(
			save.getRecord().map((r) => r.id),
			["A.a.0", "B.b.0", "C.c.0", "Unk.u.0"],
		);
	});
});

test("tied all-perfects keep save order in the limited list and id order in getB19", async () => {
	const charts: Chart[] = [
		["Alpha.Al.0", "IN", 16],
		["Bravo.Br.0", "IN", 15],
		["Delta.De.0", "IN", 14],
		["Echo.Ec.0", "IN", 14],
		["Charlie.Ch.0", "IN", 14],
		["Foxtrot.Fo.0", "IN", 13],
	];
	const plays = charts.map(([id, rank]): Play => [id, rank, 100]);
	await withCatalogAsync(charts, async () => {
		const limited = await new Save(scoredPayload(plays)).getBestWithLimit(
			33,
			[],
		);
		assert.deepEqual(
			limited.phi?.map((r) => `${r?.id} ${r?.rank}`),
			["Alpha.Al.0 IN", "Bravo.Br.0 IN", "Delta.De.0 IN"],
		);
		const full = new Save(scoredPayload(plays)).getB19(33);
		assert.deepEqual(
			full.phi.map((r) => `${r?.id} ${r?.rank}`),
			["Alpha.Al.0 IN", "Bravo.Br.0 IN", "Charlie.Ch.0 IN"],
		);
	});
});

test("a chart missing from the catalog is listed by getB19 but not by the limited list", async () => {
	const charts: Chart[] = [["K.k.0", "IN", 12]];
	await withCatalogAsync(charts, async () => {
		const mixed: Play[] = [
			["K.k.0", "IN", 95],
			["Unk.u.0", "IN", 98],
		];
		const full = new Save(scoredPayload(mixed)).getB19(33);
		assert.deepEqual(listed(full.b19_list), [
			["K.k.0", 1, "95.5625%"],
			["Unk.u.0", 2, "无法推分"],
		]);
		const limited = await new Save(scoredPayload(mixed)).getBestWithLimit(
			33,
			[],
		);
		assert.deepEqual(listed(limited.b19_list), [["K.k.0", 1, "95.5625%"]]);
		const perfect: Play[] = [
			["K.k.0", "IN", 100],
			["Unk.u.0", "IN", 100],
		];
		const { phi } = new Save(scoredPayload(perfect)).getB19(33);
		assert.equal(phi.length, 3);
		assert.equal(phi[0]?.id, "K.k.0");
		assert.equal(1 in phi, false);
		assert.equal(phi[2], undefined);
		const s = new Save(scoredPayload(perfect));
		const limitedPhi = (await s.getBestWithLimit(33, [])).phi;
		assert.equal(limitedPhi?.length, 3);
		assert.equal(limitedPhi?.[0]?.id, "K.k.0");
		assert.equal(limitedPhi?.[1], s.gameRecord["Unk.u.0"]?.[2]);
		assert.equal(limitedPhi?.[1]?.suggest, undefined);
		assert.equal(limitedPhi?.[2], undefined);
	});
});

const statsCharts: Chart[] = [
	["A.a.0", "IN", 15],
	["A.a.0", "AT", 16],
	["A.a.0", "EZ", 0],
	["B.b.0", "HD", 10],
	["B.b.0", "IN", 14],
];

function statsPayload(): SavePayload {
	const data = payload(15);
	data.gameRecord = {
		"A.a.0": [
			{ acc: 50, score: 300_000 },
			null,
			{ acc: 100, score: 1_000_000, fc: true },
			{ acc: 98, score: 980_000, fc: true },
		],
		"B.b.0": [null, null, { acc: 90, score: 650_000 }],
		"Z.z.0": [null, null, { acc: 99, score: 990_000 }],
	};
	return data;
}

test("an empty save rates every level phi", async () => {
	await withCatalogAsync([], async () => {
		assert.deepEqual(
			await new Save(payload(15)).getStats(),
			RANKS.map((title) => ({
				title,
				Rating: "phi",
				unlock: 0,
				tot: 0,
				cleared: 0,
				fc: 0,
				phi: 0,
				real_score: 0,
				tot_score: 0,
				highest: 0,
				lowest: 0,
			})),
		);
	});
});

test("stats count unlocked, cleared, full-combo and all-perfect charts per level", async () => {
	await withCatalogAsync(statsCharts, async () => {
		assert.deepEqual(await new Save(statsPayload()).getStats(), [
			{
				title: "EZ",
				Rating: "phi",
				unlock: 0,
				tot: 0,
				cleared: 0,
				fc: 0,
				phi: 0,
				real_score: 0,
				tot_score: 0,
				highest: 0,
				lowest: 0,
			},
			{
				title: "HD",
				Rating: "phi",
				unlock: 1,
				tot: 1,
				cleared: 0,
				fc: 0,
				phi: 0,
				real_score: 0,
				tot_score: 0,
				highest: 0,
				lowest: 0,
			},
			{
				title: "IN",
				Rating: "B",
				unlock: 2,
				tot: 2,
				cleared: 1,
				fc: 1,
				phi: 1,
				real_score: 1_650_000,
				tot_score: 2_000_000,
				highest: 15,
				lowest: fCompute.rks(90, 14),
			},
			{
				title: "AT",
				Rating: "FC",
				unlock: 1,
				tot: 1,
				cleared: 1,
				fc: 1,
				phi: 0,
				real_score: 980_000,
				tot_score: 1_000_000,
				highest: fCompute.rks(98, 16),
				lowest: fCompute.rks(98, 16),
			},
		]);
	});
});

test("chart totals are counted once per catalog load", async () => {
	await withCatalogAsync(statsCharts, async () => {
		const save = new Save(statsPayload());
		assert.deepEqual(
			(await save.getStats()).map((s) => s.tot),
			[0, 1, 2, 1],
		);
		getInfo.ori_info = {};
		const after = await save.getStats();
		assert.deepEqual(
			after.map((s) => s.tot),
			[0, 1, 2, 1],
		);
		assert.deepEqual(
			after.map((s) => s.unlock),
			[0, 0, 0, 0],
		);
	});
});

test("an all-perfect that fills a phi slot and reaches the goal is asked for as 100%", async () => {
	await withCatalogAsync(exampleCharts(14.95), async () => {
		const expected = [
			["PA.p.0", 1, "无法推分"],
			["PB.p.0", 2, "无法推分"],
			["PC.p.0", 3, "无法推分"],
			["T.t.0", 4, "100.0000%"],
			["F.f.0", 5, "98.4352%"],
		];
		const full = new Save(scoredPayload(examplePlays(98.2))).getB19(33);
		assert.deepEqual(listed(full.b19_list), expected);
		assert.equal(full.b19_list.find((r) => r.id === "T.t.0")?.suggestType, 5);
		const limited = await new Save(
			scoredPayload(examplePlays(98.2)),
		).getBestWithLimit(33, []);
		assert.deepEqual(listed(limited.b19_list), expected);
	});
});

test("a chart whose all-perfect falls short of the goal cannot push", async () => {
	await withCatalogAsync(exampleCharts(14.93), async () => {
		const full = new Save(scoredPayload(examplePlays(98.6))).getB19(33);
		assert.deepEqual(listed(full.b19_list), [
			["PA.p.0", 1, "无法推分"],
			["PB.p.0", 2, "无法推分"],
			["T.t.0", 3, "无法推分"],
			["PC.p.0", 4, "无法推分"],
			["F.f.0", 5, "99.2206%"],
		]);
		assert.equal(
			full.b19_list.find((r) => r.id === "T.t.0")?.suggestType,
			undefined,
		);
	});
});

test("the stored RKS does not change the accuracy asked for", async () => {
	await withCatalogAsync(exampleCharts(14.95), async () => {
		for (const stored of [3.9, 3.9065]) {
			const data = scoredPayload(examplePlays(98.4));
			data.saveInfo.summary.rankingScore = stored;
			const { b19_list } = new Save(data).getB19(33);
			const t = b19_list.find((r) => r.id === "T.t.0");
			const f = b19_list.find((r) => r.id === "F.f.0");
			assert.equal(t?.suggest, "99.9227%");
			assert.equal(t?.suggestType, 5);
			assert.equal(f?.suggest, "98.4352%");
			assert.equal(f?.suggestType, 0);
		}
	});
});

test("the accuracy asked for is never below 70%", async () => {
	const charts: Chart[] = [
		["PA.p.0", "IN", 16],
		["L.l.0", "IN", 15],
	];
	const plays: Play[] = [
		["PA.p.0", "IN", 100],
		["L.l.0", "IN", 65],
	];
	await withCatalogAsync(charts, async () => {
		const full = new Save(scoredPayload(plays)).getB19(33);
		assert.deepEqual(listed(full.b19_list), [
			["PA.p.0", 1, "无法推分"],
			["L.l.0", 2, "70.0000%"],
		]);
		assert.equal(full.b19_list.find((r) => r.id === "L.l.0")?.suggestType, 0);
		const limited = await new Save(scoredPayload(plays)).getBestWithLimit(
			33,
			[],
		);
		assert.deepEqual(listed(limited.b19_list), [["PA.p.0", 1, "无法推分"]]);
	});
});

test("a limited call does not change the accuracy getB19 asks for afterwards", async () => {
	await withCatalogAsync(listCharts, async () => {
		const save = new Save(scoredPayload(listPlays));
		await save.getBestWithLimit(33, [{ type: "acc", value: [95, 100] }]);
		assert.deepEqual(listed(save.getB19(33).b19_list), [
			["A.a.0", 1, "无法推分"],
			["B.b.0", 2, "99.1477%"],
			["C.c.0", 3, "95.1749%"],
			["Unk.u.0", 4, "无法推分"],
		]);
	});
});

test("every listed chart asks for the Targets accuracy rounded up, and that accuracy reaches the goal", async () => {
	let plain = 0;
	let viaAp = 0;
	let stuck = 0;
	let floor = 0;
	for (const [seed, n] of SAVES) {
		const { charts, plays } = randomPlays(seed, n);
		await withCatalogAsync(charts, async () => {
			const save = new Save(scoredPayload(plays));
			const records: SimBaseRecord[] = save
				.getRecord()
				.map((r) => [r.id, r.rank as LevelKind, r.acc, r.difficulty]);
			const { goal, targets } = targetsFor(records);
			const expected = (row: { id: string; rank: string; acc: number }) => {
				if (row.acc >= 100) return "无法推分";
				const t = targets.find((x) => x.id === row.id && x.rank === row.rank);
				if (t?.need == null) return "无法推分";
				if (t.viaAp) return "100.0000%";
				return `${roundUp(t.need, 4).toFixed(4)}%`;
			};
			for (const row of save.getB19(33).b19_list) {
				const label = `${seed} ${row.id} ${row.rank}`;
				assert.equal(row.suggest, expected(row), label);
				if (row.suggest === "无法推分") {
					if (row.acc < 100) stuck++;
					continue;
				}
				if (row.suggest === "100.0000%") viaAp++;
				else plain++;
				if (row.suggest === "70.0000%") floor++;
				const reached = simulate(records, [
					{
						id: row.id,
						rank: row.rank as LevelKind,
						acc: Number.parseFloat(row.suggest ?? "").toFixed(6),
					},
				]).after;
				assert.ok(reached >= goal - 1e-9, label);
			}
			const limited = await new Save(scoredPayload(plays)).getBestWithLimit(
				33,
				[{ type: "acc", value: [90, 100] }],
			);
			for (const row of limited.b19_list) {
				assert.equal(row.suggest, expected(row), `${seed} ${row.id}`);
			}
		});
	}
	assert.ok(plain > 0, `${plain}`);
	assert.ok(viaAp > 0, `${viaAp}`);
	assert.ok(stuck > 0, `${stuck}`);
	assert.ok(floor > 0, `${floor}`);
});

test("a save whose stored RKS matches its records keeps the stored header", async () => {
	await withCatalogAsync(listCharts, async () => {
		const data = () => {
			const d = scoredPayload(listPlays);
			d.saveInfo.summary.rankingScore = 1.912;
			return d;
		};
		const full = new Save(data()).getB19(33);
		const limited = await new Save(data()).getBestWithLimit(33, [
			{ type: "acc", value: [95, 100] },
		]);
		for (const pushRks of [full.pushRks, limited.pushRks]) {
			assert.equal(pushRks, 1.9119999999999997);
			assert.equal(headerRks(1.912, pushRks), 1.912);
			assert.equal(headerRks(1.912, pushRks).toFixed(4), "1.9120");
		}
	});
});

test("a chart missing from the catalog puts the recomputed RKS in the header", async () => {
	const charts: Chart[] = [["K.k.0", "IN", 12]];
	const plays: Play[] = [
		["K.k.0", "IN", 95],
		["Unk.u.0", "IN", 98],
	];
	await withCatalogAsync(charts, async () => {
		const { pushRks } = new Save(scoredPayload(plays)).getB19(33);
		assert.equal(pushRks, 0.3160493827160494);
		assert.equal(headerRks(15, pushRks), pushRks);
		assert.equal(headerRks(15, pushRks).toFixed(4), "0.3160");
	});
});

test("a stored RKS below the records' RKS gives way to the records' RKS", async () => {
	await withCatalogAsync(exampleCharts(14.95), async () => {
		const data = scoredPayload(examplePlays(98.4));
		data.saveInfo.summary.rankingScore = 3.9;
		const save = new Save(data);
		const { b19_list, pushRks } = save.getB19(33);
		const records: SimBaseRecord[] = save
			.getRecord()
			.map((r) => [r.id, r.rank as LevelKind, r.acc, r.difficulty]);
		assert.equal(pushRks, targetsFor(records).rks);
		assert.equal(pushRks, 3.904497942386832);
		assert.equal(headerRks(3.9, pushRks), pushRks);
		assert.equal(headerRks(3.9, pushRks).toFixed(4), "3.9045");
		assert.equal(b19_list.find((r) => r.id === "T.t.0")?.suggest, "99.9227%");
	});
});

test("a manual-mode profile keeps its stored header", async () => {
	const { charts, plays } = randomPlays(22, 30);
	await withCatalogAsync(charts, async () => {
		const save = new Save(scoredPayload(plays));
		const stored = rankingScoreOf(save.getRecord());
		save.saveInfo.summary.rankingScore = stored;
		assert.equal(stored, 4.760877584897021);
		const { pushRks } = save.getB19(33);
		assert.equal(pushRks, 4.76087758489702);
		assert.equal(headerRks(stored, pushRks), stored);
	});
});

test("a save with no records has a header of 0", async () => {
	await withCatalogAsync([], async () => {
		const full = new Save(payload(0)).getB19(33);
		const limited = await new Save(payload(0)).getBestWithLimit(33, []);
		assert.equal(full.pushRks, 0);
		assert.equal(limited.pushRks, 0);
		assert.equal(headerRks(0, 0), 0);
		assert.equal(headerRks(0, 0).toFixed(4), "0.0000");
	});
});
