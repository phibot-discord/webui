import assert from "node:assert/strict";
import test from "node:test";
import { parseTagVotes } from "./chart-tag-votes";
import {
	PROFILE,
	type ProfileRecord,
	profileRecordsOf,
	radarGeometry,
	signed,
	tagProfile,
	tagProfileDetail,
} from "./tag-profile";

const TREE = [
	{
		id: 10,
		name: "读谱",
		children: [
			{ id: 1, name: "差速" },
			{ id: 5, name: "脑裂" },
		],
	},
	{ id: 11, name: "硬抗", children: [{ id: 2, name: "快交互" }] },
	{ id: 12, name: "拆谱", children: [{ id: 3, name: "锁手" }] },
	{
		id: 13,
		name: "定位",
		children: [
			{ id: 4, name: "倒打" },
			{ id: 5, name: "脑裂" },
		],
	},
	{ id: 14, name: "多指", children: [{ id: 6, name: "5k" }] },
];

function rand(seed: number) {
	let x = seed >>> 0;
	return () => {
		x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
		return x / 2 ** 32;
	};
}

function gauss(next: () => number) {
	const u = Math.max(next(), 1e-12);
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
}

function rksOf(acc: number, c: number) {
	return acc < 70 ? 0 : c * ((acc - 55) / 45) ** 2;
}

function world(skill: number, planted: Record<number, number>, seed: number) {
	const next = rand(seed);
	const records: ProfileRecord[] = [];
	const charts: Record<
		string,
		{ votes: Record<string, Record<number, number>> }
	> = {};
	const tags = [1, 2, 3, 4, 5, 6];
	for (let i = 0; i < 160; i++) {
		const difficulty = Math.round((12 + (i % 80) * 0.075) * 10) / 10;
		const a = tags[i % 6]!;
		const b = tags[(i * 7 + 3) % 6]!;
		const votes = a === b ? { [a]: 6 } : { [a]: 6, [b]: 3 };
		const bonus =
			((planted[a] ?? 0) * 6 + (planted[b] ?? 0) * (a === b ? 0 : 3)) /
			(a === b ? 6 : 9);
		const m = skill + bonus - difficulty;
		const acc = Math.min(
			100,
			Math.max(55, 100 - 2.5 * Math.exp(-1.2 * m) + 0.3 * gauss(next)),
		);
		const id = `s${i}`;
		records.push({
			id: `${id}.0`,
			level: "IN",
			difficulty,
			rks: rksOf(acc, difficulty),
			acc,
		});
		charts[id] = { votes: { IN: votes } };
	}
	return { records, votes: parseTagVotes({ sha: "t", tree: TREE, charts }) };
}

test("planted strengths and weaknesses come back on the right side", () => {
	const { records, votes } = world(15.5, { 2: 0.8, 4: -0.8 }, 7);
	const out = tagProfile(records, votes);
	assert.equal(out.insufficient, false);
	assert.equal(out.strong[0]?.name, "快交互");
	assert.equal(out.weak[0]?.name, "倒打");
	assert.ok(out.strong[0]!.diff > 0);
	assert.ok(out.weak[0]!.diff < 0);
	assert.match(out.strong[0]!.shown, /^\+\d\.\d\d$/);
	assert.match(out.weak[0]!.shown, /^-\d\.\d\d$/);
	const cat = Object.fromEntries(out.categories.map((c) => [c.name, c.diff]));
	assert.ok(cat.硬抗! > 0);
	assert.ok(cat.定位! < 0);
	const strong = new Set(out.strong.map((t) => t.name));
	assert.deepEqual(
		out.weak.filter((t) => strong.has(t.name)),
		[],
	);
	assert.ok(out.strong[0]!.best > out.strong[0]!.worst);
	assert.ok(out.weak[0]!.worst > out.weak[0]!.best);
});

test("a player with no planted skill gets a flat profile, whatever the charts' constants", () => {
	for (const seed of [1, 2, 3]) {
		const { records, votes } = world(15.5, {}, seed);
		const out = tagProfile(records, votes);
		for (const tag of out.tags) {
			assert.ok(Math.abs(tag.diff) < 0.15, `${tag.name} ${tag.diff}`);
		}
	}
});

test("every tag on the pooled charts gets a row, best first, with its side", () => {
	const { records, votes } = world(15.5, { 2: 0.8, 4: -0.8 }, 7);
	const out = tagProfile(records, votes);
	assert.equal(out.tags.length, 6);
	for (const t of out.tags)
		assert.equal(t.slight, Math.abs(Number(t.shown)) < PROFILE.slight, t.name);
	assert.ok(out.strong[0]!.diff >= PROFILE.slight);
	assert.equal(out.strong[0]!.slight, false);
	for (let i = 1; i < out.tags.length; i++)
		assert.ok(out.tags[i - 1]!.diff >= out.tags[i]!.diff);
	assert.deepEqual(
		out.strong.map((t) => t.name),
		out.tags.filter((t) => t.side === "strong").map((t) => t.name),
	);
	assert.deepEqual(
		out.weak.map((t) => t.name),
		out.tags
			.filter((t) => t.side === "weak")
			.reverse()
			.map((t) => t.name),
	);
});

test("a tag needs its charts in the best third to count as a strength, not just a positive mean", () => {
	const plan: [tag: number, lean: number, n: number][] = [
		[1, 0.3, 24],
		[2, -0.3, 18],
		[3, 0, 18],
		[4, 0.1, 6],
	];
	const records: ProfileRecord[] = [];
	const charts: Record<
		string,
		{ votes: Record<string, Record<number, number>> }
	> = {};
	let i = 0;
	for (const [tag, lean, n] of plan) {
		for (let k = 0; k < n; k++, i++) {
			const difficulty = 15 + ((i * 7) % 20) * 0.1;
			records.push({
				id: `c${i}.0`,
				level: "IN",
				difficulty,
				rks: difficulty - 0.5 + lean,
			});
			charts[`c${i}`] = { votes: { IN: { [tag]: 5 } } };
		}
	}
	const out = tagProfile(
		records,
		parseTagVotes({ sha: "t", tree: TREE, charts }),
	);
	const row = (name: string) => out.tags.find((t) => t.name === name)!;
	assert.equal(row("差速").side, "strong");
	assert.equal(row("快交互").side, "weak");
	assert.equal(row("锁手").side, "even");
	assert.ok(row("倒打").diff >= PROFILE.minDiff);
	assert.equal(row("倒打").best, 0);
	assert.equal(row("倒打").side, "even");
});

test("the detail lists every chart that counts toward a tag, with its share and third", () => {
	const { records, votes } = world(15.5, { 2: 0.8 }, 3);
	const detail = tagProfileDetail(records, votes);
	const row = detail.analysis.tags.find((t) => t.name === "快交互")!;
	const list = detail.byTag.get("快交互")!;
	assert.equal(list.length, row.charts);
	assert.equal(
		list.filter((c) => detail.charts[c.chart]!.group === "best").length,
		row.best,
	);
	for (const c of list) {
		const chart = detail.charts[c.chart]!;
		assert.ok(c.share >= PROFILE.minShare && c.share <= 1);
		assert.ok(Number.isFinite(chart.expected));
		assert.equal(typeof chart.acc, "number");
	}
	const weighted =
		list.reduce((s, c) => s + c.share * detail.charts[c.chart]!.diff, 0) /
		(list.reduce((s, c) => s + c.share, 0) + PROFILE.prior);
	assert.ok(Math.abs(weighted - row.diff) < 1e-12);
	const groups = detail.charts.map((c) => c.group);
	const third = Math.floor(detail.charts.length / 3);
	assert.equal(groups.filter((g) => g === "best").length, third);
	assert.equal(groups.filter((g) => g === "worst").length, third);
	assert.ok(detail.byCategory.get("硬抗")!.length > 0);
});

test("the pool runs from 1.0 below to 2.0 above the 27th-best chart RKS", () => {
	const { records, votes } = world(15.5, {}, 4);
	const out = tagProfile(records, votes);
	const floor = records.map((r) => r.rks).sort((a, b) => b - a)[
		PROFILE.floorSlot - 1
	]!;
	assert.ok(out.range);
	assert.ok(Math.abs(out.range.min - (floor - 1)) <= 0.1 + 1e-9);
	assert.ok(Math.abs(out.range.max - (floor + 2)) <= 0.1 + 1e-9);
	const inPool = records.filter(
		(r) => r.difficulty >= out.range!.min && r.difficulty <= out.range!.max,
	);
	assert.equal(out.recordCount, inPool.length);
	assert.equal(out.chartCount, inPool.length);
});

test("a tag under two categories counts toward both", () => {
	const { records, votes } = world(15.5, { 5: -0.8 }, 9);
	const out = tagProfile(records, votes);
	const cat = Object.fromEntries(out.categories.map((c) => [c.name, c.diff]));
	assert.ok(cat.读谱! < 0);
	assert.ok(cat.定位! < 0);
	assert.equal(out.weak[0]?.name, "脑裂");
});

test("too few voted charts near the player's level is insufficient", () => {
	const { records } = world(15.5, {}, 5);
	const thin = parseTagVotes({
		sha: "t",
		tree: TREE,
		charts: Object.fromEntries(
			records.flatMap((r) =>
				r.difficulty >= 16 && r.difficulty < 16.4
					? [[r.id.replace(/\.0$/, ""), { votes: { IN: { 1: 5 } } }]]
					: [],
			),
		),
	});
	const out = tagProfile(records, thin);
	assert.ok(out.chartCount < PROFILE.minCharts);
	assert.equal(out.insufficient, true);
	assert.equal(tagProfile([], thin).insufficient, true);
});

test("charts with fewer than 3 votes are ignored", () => {
	const { records } = world(15.5, {}, 6);
	const out = tagProfile(
		records,
		parseTagVotes({
			sha: "t",
			tree: TREE,
			charts: Object.fromEntries(
				records.map((r) => [
					r.id.replace(/\.0$/, ""),
					{ votes: { IN: { 1: 2 } } },
				]),
			),
		}),
	);
	assert.equal(out.chartCount, 0);
	assert.equal(out.totalVotes, 0);
	assert.equal(out.insufficient, true);
});

test("profileRecordsOf keeps scored EZ–AT charts with their acc, never Legacy or charts without a constant", () => {
	const out = profileRecordsOf({
		"A.x.0": [
			{ rank: "EZ", difficulty: 3, rks: 2, acc: 97.5 },
			null,
			{ rank: "IN", difficulty: 15.2, rks: 14.9 },
			undefined,
			{ rank: "LEGACY", difficulty: 14, rks: 13 },
		],
		"Fools.y.0": [null, null, { rank: "IN", difficulty: 0, rks: 0 }],
	});
	assert.deepEqual(out, [
		{ id: "A.x.0", level: "EZ", difficulty: 3, rks: 2, acc: 97.5 },
		{ id: "A.x.0", level: "IN", difficulty: 15.2, rks: 14.9 },
	]);
});

test("signed differences read +0.11 / -0.23 / 0.00", () => {
	assert.equal(signed(0.106), "+0.11");
	assert.equal(signed(-0.2304), "-0.23");
	assert.equal(signed(0.004), "0.00");
	assert.equal(signed(-0.004), "0.00");
});

test("radar sits on the card's 200×184 plot: centre (100,92), radius 55, labels at 78", () => {
	const rows = TREE.map((c, i) => ({
		name: c.name,
		diff: i === 0 ? 0.3 : 0,
		hasVotes: i !== 4,
		votes: 10,
	}));
	const radar = radarGeometry(rows);
	assert.equal(radar.grids.length, 4);
	assert.equal(radar.axes.length, 5);
	assert.deepEqual(radar.axes[0], { x: 100, y: 37 });
	const top = radar.categories[0]!;
	assert.equal(top.anchor, "middle");
	assert.ok(Math.abs(top.labelY - 14) < 1e-9);
	assert.ok(Math.abs(top.pointY - (92 - 55)) < 1e-9);
	assert.equal(top.shown, "+0.30");
	const flat = radar.categories[1]!;
	const r = Math.hypot(flat.pointX - 100, flat.pointY - 92);
	assert.ok(Math.abs(r - 55 * 0.55) < 1e-9);
	assert.equal(flat.anchor, "start");
	assert.equal(flat.shown, "0.00");
	assert.equal(radar.categories[4]!.shown, "–");
	assert.equal(radar.categories[3]!.anchor, "end");
	assert.equal(radarGeometry(rows.slice(0, 2)).categories.length, 0);
});
