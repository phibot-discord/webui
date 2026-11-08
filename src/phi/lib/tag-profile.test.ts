import assert from "node:assert/strict";
import test from "node:test";
import { parseTagVotes } from "./chart-tag-votes";
import {
	accOfNines,
	historyProfileDetail,
	nines,
	PROFILE,
	type ProfileRecord,
	profileRecordsOf,
	radarGeometry,
	rksScale,
	signed,
	tagProfile,
	tagProfileDetail,
	weightOf,
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

type Charts = Record<string, { votes: Record<string, Record<number, number>> }>;

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

function record(id: string, difficulty: number, acc: number): ProfileRecord {
	return {
		id: `${id}.0`,
		level: "IN",
		difficulty,
		rks: rksOf(acc, difficulty),
		acc,
	};
}

function world(skill: number, planted: Record<number, number>, seed: number) {
	const next = rand(seed);
	const records: ProfileRecord[] = [];
	const charts: Charts = {};
	const pick = () => 1 + Math.floor(next() * 6);
	for (let i = 0; i < 160; i++) {
		const difficulty = Math.round((12 + i * 0.0375) * 10) / 10;
		const a = pick();
		let b = pick();
		while (b === a) b = pick();
		let c = pick();
		while (c === a || c === b) c = pick();
		const votes: Record<number, number> = { [a]: 6 };
		if (next() < 0.7) votes[b] = 3;
		if (next() < 0.3) votes[c] = 2;
		let total = 0;
		for (const v of Object.values(votes)) total += v;
		let bonus = 0;
		for (const [t, v] of Object.entries(votes))
			bonus += ((planted[Number(t)] ?? 0) * v) / total;
		const m = skill + bonus - difficulty;
		const loss = 2.5 * Math.exp(-1.2 * m) * Math.exp(0.3 * gauss(next));
		const acc = Math.min(100, Math.max(55, 100 - loss));
		records.push(record(`s${i}`, difficulty, acc));
		charts[`s${i}`] = { votes: { IN: votes } };
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
	assert.ok(out.strong[0]!.hold >= PROFILE.firmHold);
	assert.ok(out.weak[0]!.hold >= PROFILE.firmHold);
	assert.equal(out.strong[0]!.firm, true);
	assert.equal(out.weak[0]!.firm, true);
	assert.ok(out.strong[0]!.mean > 0);
	assert.ok(out.weak[0]!.mean < 0);
	assert.match(out.strong[0]!.shown, /^\d+\.\d\d$/);
	assert.match(out.weak[0]!.shown, /^\d+\.\d\d$/);
	assert.ok(out.strong[0]!.rating > out.rks);
	assert.ok(out.weak[0]!.rating < out.rks);
	assert.equal(out.strong[0]!.shown, out.strong[0]!.rating.toFixed(2));
	const cat = Object.fromEntries(out.categories.map((c) => [c.name, c.diff]));
	assert.ok(cat.硬抗! > 0);
	assert.ok(cat.定位! < 0);
	const strong = new Set(out.strong.map((t) => t.name));
	assert.deepEqual(
		out.weak.filter((t) => strong.has(t.name)),
		[],
	);
});

test("a player with no planted skill gets a flat profile; a firm listing is rare and small", () => {
	const firm: string[] = [];
	for (const seed of [1, 2, 3, 4, 5, 6]) {
		const { records, votes } = world(15.5, {}, seed);
		const out = tagProfile(records, votes);
		for (const tag of out.tags)
			assert.ok(Math.abs(tag.diff) < 0.15, `${seed} ${tag.name} ${tag.diff}`);
		for (const tag of [...out.strong, ...out.weak]) {
			assert.ok(tag.hold >= PROFILE.minHold);
			assert.equal(tag.faint, Math.abs(tag.diff) < PROFILE.minDiff);
			assert.ok(Math.abs(tag.diff) >= PROFILE.minFaint);
			if (tag.firm && !tag.faint)
				firm.push(`${seed} ${tag.name} ${tag.shown} ${tag.hold}`);
		}
	}
	assert.ok(firm.length <= 3, firm.join("; "));
});

test("every tag on the pooled charts gets a row, best first, with its side", () => {
	const { records, votes } = world(15.5, { 2: 0.8, 4: -0.8 }, 7);
	const out = tagProfile(records, votes);
	assert.equal(out.tags.length, 6);
	for (const t of out.tags) {
		assert.equal(t.firm, t.hold >= PROFILE.firmHold, t.name);
		assert.equal(
			t.slight,
			Math.abs(Number(signed(t.diff))) < PROFILE.slight,
			t.name,
		);
	}
	assert.ok(out.strong[0]!.diff >= PROFILE.slight);
	assert.equal(out.strong[0]!.slight, false);
	for (let i = 1; i < out.tags.length; i++)
		assert.ok(out.tags[i - 1]!.diff >= out.tags[i]!.diff);
	const names = (rows: { name: string }[]) => rows.map((t) => t.name).sort();
	assert.deepEqual(
		names(out.strong),
		names(out.tags.filter((t) => t.side === "strong")),
	);
	assert.deepEqual(
		names(out.weak),
		names(out.tags.filter((t) => t.side === "weak")),
	);
	for (const list of [out.strong, out.weak])
		for (let i = 1; i < list.length; i++)
			assert.ok(Number(list[i - 1]!.firm) >= Number(list[i]!.firm));
	for (const t of out.tags) {
		if (t.side === "even") continue;
		assert.ok(t.charts >= PROFILE.minTagCharts);
		assert.ok(t.hold >= PROFILE.minHold);
		assert.ok(Math.abs(t.diff) >= PROFILE.minDiff);
	}
});

test("a tag that only rides along with a real strength gets no credit of its own", () => {
	const records: ProfileRecord[] = [];
	const charts: Charts = {};
	let i = 0;
	const put = (
		difficulty: number,
		acc: number,
		votes: Record<number, number>,
	) => {
		records.push(record(`c${i}`, difficulty, acc));
		charts[`c${i}`] = { votes: { IN: votes } };
		i += 1;
	};
	const at = (y: number) => accOfNines(y);
	for (let k = 0; k <= 10; k++) {
		const c = 15 + k * 0.1;
		put(c, at(2.5), { 6: 6 });
		put(c, at(2.25), { 6: 5, 1: 5 });
		put(c, at(2), { 1: 6 });
		put(c, at(1.625), { 3: 6 });
		put(c, at(1.625), { 4: 6 });
	}
	const out = tagProfile(
		records,
		parseTagVotes({ sha: "t", tree: TREE, charts }),
	);
	const row = (name: string) => out.tags.find((t) => t.name === name)!;
	assert.equal(row("5k").side, "strong");
	assert.ok(row("差速").mean > PROFILE.minDiff);
	assert.ok(Math.abs(row("差速").diff) < PROFILE.minDiff);
	assert.equal(row("差速").side, "even");
	assert.equal(row("锁手").side, "weak");
	assert.equal(row("倒打").side, "weak");
	assert.deepEqual(
		out.strong.map((t) => t.name),
		["5k"],
	);
});

test("the detail lists every chart that counts toward a tag, with its share, weight and third", () => {
	const { records, votes } = world(15.5, { 2: 0.8 }, 3);
	const detail = tagProfileDetail(records, votes);
	const row = detail.analysis.tags.find((t) => t.name === "快交互")!;
	const list = detail.byTag.get("快交互")!;
	assert.equal(list.length, row.charts);
	assert.equal(
		list.filter((c) => detail.charts[c.chart]!.group === "best").length,
		row.best,
	);
	let sw = 0;
	let ss = 0;
	for (const c of list) {
		const chart = detail.charts[c.chart]!;
		assert.ok(c.share >= PROFILE.minShare && c.share <= 1);
		assert.ok(chart.expected > 0 && chart.expected < 100);
		assert.ok(chart.weight > 0 && chart.weight <= 1);
		assert.equal(typeof chart.acc, "number");
		sw += c.share * chart.weight;
		ss += c.share * chart.weight * chart.diff;
	}
	assert.ok(Math.abs(ss / (sw + PROFILE.prior) - row.mean) < 1e-12);
	const groups = detail.charts.map((c) => c.group);
	const third = Math.floor(detail.charts.length / 3);
	assert.equal(groups.filter((g) => g === "best").length, third);
	assert.equal(groups.filter((g) => g === "worst").length, third);
	assert.ok(detail.byCategory.get("硬抗")!.length > 0);
	const again = tagProfileDetail(records, votes);
	assert.deepEqual(again.analysis, detail.analysis);
});

test("the pool starts 0.25 below the 27th-best chart RKS, has no top, and skips charts at or under 80%", () => {
	const { records, votes } = world(15.5, {}, 4);
	const out = tagProfile(records, votes);
	const floor = records.map((r) => r.rks).sort((a, b) => b - a)[
		PROFILE.floorSlot - 1
	]!;
	assert.ok(out.range);
	assert.ok(out.range.min >= floor - PROFILE.below - 1e-9);
	assert.ok(out.range.min < floor - PROFILE.below + 0.1);
	const inPool = records.filter(
		(r) => r.difficulty >= out.range!.min - 1e-9 && weightOf(r.acc!) > 0,
	);
	assert.equal(out.recordCount, inPool.length);
	assert.equal(out.range.max, Math.max(...inPool.map((r) => r.difficulty)));
	assert.ok(records.some((r) => r.acc! <= PROFILE.rampFrom));
	assert.ok(out.chartCount <= out.recordCount);
});

test("accuracy under 90% counts less, and 100% is read as 99.9%", () => {
	assert.equal(weightOf(95), 1);
	assert.equal(weightOf(85), 0.5);
	assert.equal(weightOf(80), 0);
	assert.equal(weightOf(70), 0);
	assert.ok(Math.abs(nines(99) - 2) < 1e-12);
	assert.ok(Math.abs(nines(99.9) - 3) < 1e-12);
	assert.ok(Math.abs(nines(100) - 3) < 1e-12);
	assert.ok(Math.abs(accOfNines(nines(97.25)) - 97.25) < 1e-9);
	const records: ProfileRecord[] = [];
	const charts: Charts = {};
	for (let k = 0; k < 40; k++) {
		const c = 15 + (k % 8) * 0.1;
		const acc = k === 0 ? 100 : k === 1 ? 85 : 99.5;
		records.push(record(`c${k}`, c, acc));
		charts[`c${k}`] = { votes: { IN: { [1 + (k % 6)]: 5 } } };
	}
	const detail = tagProfileDetail(
		records,
		parseTagVotes({ sha: "t", tree: TREE, charts }),
	);
	const perfect = detail.charts.find((c) => c.acc === 100)!;
	const rough = detail.charts.find((c) => c.acc === 85)!;
	assert.ok(perfect.diff > 0.3);
	assert.equal(rough.weight, 0.5);
	assert.ok(rough.diff < 0);
});

test("the hardest chart counts even with no other chart near its constant", () => {
	const records: ProfileRecord[] = [];
	const charts: Charts = {};
	for (let k = 0; k < 30; k++) {
		records.push(record(`c${k}`, 15 + (k % 5) * 0.1, 99 + (k % 4) * 0.2));
		charts[`c${k}`] = { votes: { IN: { [1 + (k % 6)]: 5 } } };
	}
	records.push(record("lone", 16.2, 99.4));
	charts.lone = { votes: { IN: { 2: 5 } } };
	const detail = tagProfileDetail(
		records,
		parseTagVotes({ sha: "t", tree: TREE, charts }),
	);
	assert.equal(detail.analysis.recordCount, 31);
	assert.equal(detail.analysis.chartCount, 31);
	assert.equal(detail.analysis.range?.max, 16.2);
	const lone = detail.charts.find((c) => c.id === "lone.0")!;
	assert.ok(lone.expected > 0 && lone.expected < 100);
	assert.ok(Number.isFinite(lone.diff));
});

test("a chart's expected accuracy comes from the other charts, not itself", () => {
	const records: ProfileRecord[] = [];
	const charts: Charts = {};
	for (let k = 0; k < 30; k++) {
		records.push(record(`c${k}`, 15 + (k % 10) * 0.1, accOfNines(2)));
		charts[`c${k}`] = { votes: { IN: { [1 + (k % 6)]: 5 } } };
	}
	records.push(record("star", 15.5, accOfNines(2.8)));
	charts.star = { votes: { IN: { 1: 3, 2: 3 } } };
	const detail = tagProfileDetail(
		records,
		parseTagVotes({ sha: "t", tree: TREE, charts }),
	);
	const star = detail.charts.find((c) => c.id === "star.0")!;
	assert.ok(nines(star.expected) < 2.1, String(star.expected));
	assert.ok(star.diff > 0.7, String(star.diff));
});

test("a 99.9%+ score where the curve already expects more is not read as a weakness", () => {
	const records: ProfileRecord[] = [];
	const charts: Charts = {};
	for (let k = 0; k < 40; k++) {
		const c = 15 + (k % 20) * 0.1;
		const y = 3.6 - 0.8 * (c - 15);
		const easy = k % 2 === 0;
		const acc = easy || y >= 3 ? 100 : accOfNines(y);
		records.push(record(`c${k}`, c, acc));
		charts[`c${k}`] = { votes: { IN: easy ? { 3: 6 } : { 6: 6 } } };
	}
	const out = tagProfile(
		records,
		parseTagVotes({ sha: "t", tree: TREE, charts }),
	);
	assert.equal(out.basis, "scores");
	const lock = out.tags.find((t) => t.name === "锁手")!;
	assert.notEqual(lock.side, "weak");
});

test("when every chart is 99.9%+, tags are ranked by how hard their charts are, dimmed and without numbers", () => {
	const records: ProfileRecord[] = [];
	const charts: Charts = {};
	for (let k = 0; k < 30; k++) {
		const c = 15 + (k % 15) * 0.1;
		records.push(record(`c${k}`, c, 100));
		charts[`c${k}`] = { votes: { IN: c >= 15.8 ? { 2: 6 } : { 4: 6 } } };
	}
	const out = tagProfile(
		records,
		parseTagVotes({ sha: "t", tree: TREE, charts }),
	);
	assert.equal(out.basis, "aps");
	assert.equal(out.strong[0]?.name, "快交互");
	assert.equal(out.weak[0]?.name, "倒打");
	for (const tag of [...out.strong, ...out.weak]) {
		assert.equal(tag.shown, "");
		assert.equal(tag.faint, true);
		assert.equal(tag.slight, true);
		assert.equal(tag.firm, false);
	}
	assert.ok(out.categories.every((c) => !c.hasVotes && c.shown === "–"));
});

test("faint entries are listed after the others", () => {
	for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
		const { records, votes } = world(15.5, { 2: 0.4, 4: -0.4 }, seed);
		const out = tagProfile(records, votes);
		for (const list of [out.strong, out.weak]) {
			const firstFaint = list.findIndex((t) => t.faint);
			if (firstFaint < 0) continue;
			assert.ok(list.slice(firstFaint).every((t) => t.faint));
			assert.ok(list.slice(firstFaint).every((t) => t.slight));
		}
	}
});

test("an all-99.9%+ save falls back to the last day with charts still under 99.9%", () => {
	const charts: Charts = {};
	const history: Record<string, Record<string, unknown[][]>> = {};
	const constants = new Map<string, number>();
	const day = (n: number) => new Date(Date.UTC(2026, 9, n, 4));
	const now: ProfileRecord[] = [];
	for (let k = 0; k < 30; k++) {
		const id = `c${k}.0`;
		const c = 15 + (k % 10) * 0.1;
		constants.set(id, c);
		charts[`c${k}`] = { votes: { IN: { [1 + (k % 6)]: 5 } } };
		const apDay = k < 15 ? 10 : 20;
		history[id] = {
			IN: [
				[(99 + (k % 5) * 0.1).toFixed(4), 980000, day(1), false],
				[
					"100.0000",
					1000000,
					k % 2 ? day(apDay).toISOString() : day(apDay),
					true,
				],
			],
		};
		now.push(record(`c${k}`, c, 100));
	}
	const votes = parseTagVotes({ sha: "t", tree: TREE, charts });
	assert.equal(tagProfile(now, votes).basis, "aps");
	const past = historyProfileDetail(
		history as never,
		(id) => constants.get(id),
		votes,
	)!;
	assert.equal(past.analysis.basis, "history");
	assert.equal(past.analysis.asOf, day(10).toISOString());
	assert.equal(past.analysis.recordCount, 30);
	assert.equal(past.charts.filter((c) => c.acc < 99.9).length, 15);
	assert.equal(
		historyProfileDetail({}, (id) => constants.get(id), votes),
		undefined,
	);
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
				r.difficulty >= 15 && r.difficulty < 15.3
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

test("a record without acc takes it back from its RKS", () => {
	const records: ProfileRecord[] = [];
	const charts: Charts = {};
	for (let k = 0; k < 30; k++) {
		const r = record(`c${k}`, 15 + (k % 5) * 0.1, 99 + (k % 4) * 0.2);
		records.push(k % 2 ? { ...r, acc: undefined } : r);
		charts[`c${k}`] = { votes: { IN: { [1 + (k % 6)]: 5 } } };
	}
	const detail = tagProfileDetail(
		records,
		parseTagVotes({ sha: "t", tree: TREE, charts }),
	);
	assert.equal(detail.charts.length, 30);
	for (const c of detail.charts)
		assert.ok(
			Math.abs(c.acc - (99 + (Number(c.id.slice(1, -2)) % 4) * 0.2)) < 1e-6,
		);
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
		rating: i === 0 ? 16.204 : 16,
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
	assert.equal(top.shown, "16.20");
	const flat = radar.categories[1]!;
	const r = Math.hypot(flat.pointX - 100, flat.pointY - 92);
	assert.ok(Math.abs(r - 55 * 0.55) < 1e-9);
	assert.equal(flat.anchor, "start");
	assert.equal(flat.shown, "16.00");
	assert.equal(radar.categories[4]!.shown, "–");
	assert.equal(radar.categories[3]!.anchor, "end");
	assert.equal(radarGeometry(rows.slice(0, 2)).categories.length, 0);
});

test("the RKS scale is your RKS with every chart's lost accuracy scaled by 10^-net, and APs stay APs", () => {
	const records: ProfileRecord[] = [];
	for (let i = 0; i < 40; i++) {
		const c = 14 + i * 0.1;
		const acc = i % 8 === 0 ? 100 : 97 + (i % 5) * 0.5;
		records.push({
			id: `S${i}.x.0`,
			level: "IN",
			difficulty: c,
			rks: c * ((acc - 55) / 45) ** 2,
			acc,
		});
	}
	const scale = rksScale(records);
	const sorted = records.map((r) => r.rks).sort((a, b) => b - a);
	const aps = records
		.filter((r) => r.acc === 100)
		.map((r) => r.rks)
		.sort((a, b) => b - a);
	const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
	const expected = (sum(sorted.slice(0, 27)) + sum(aps.slice(0, 3))) / 30;
	assert.ok(Math.abs(scale.rks - expected) < 1e-9);
	assert.equal(scale.at(0), scale.rks);
	const half = records.map((r) => {
		if (r.acc === 100) return r.rks;
		const acc = 100 - (100 - r.acc!) * 10 ** -0.3;
		return r.difficulty * ((acc - 55) / 45) ** 2;
	});
	const want =
		(sum(half.sort((a, b) => b - a).slice(0, 27)) + sum(aps.slice(0, 3))) / 30;
	assert.ok(Math.abs(scale.at(0.3) - want) < 1e-9);
	let last = -Infinity;
	for (const d of [-0.4, -0.2, -0.05, 0, 0.05, 0.2, 0.4]) {
		const v = scale.at(d);
		assert.ok(v > last, `${d} ${v}`);
		last = v;
	}
	assert.ok(Math.abs(scale.at(-0.001) - scale.rks) < 0.01);
	const allAp = records.map((r) => ({ ...r, acc: 100, rks: r.difficulty }));
	const ap = rksScale(allAp);
	assert.equal(ap.at(-0.5), ap.rks);
});

test("a tag at 0 shows exactly the player's RKS, and the analysis carries that RKS", () => {
	const { records, votes } = world(15.5, { 2: 0.8, 4: -0.8 }, 7);
	const out = tagProfile(records, votes);
	assert.ok(Math.abs(out.rks - rksScale(records).rks) < 1e-12);
	for (const t of out.tags) {
		if (t.diff > 0) assert.ok(t.rating > out.rks, t.name);
		if (t.diff < 0) assert.ok(t.rating < out.rks, t.name);
	}
	const sorted = [...out.tags].sort((a, b) => a.diff - b.diff);
	for (let i = 1; i < sorted.length; i++)
		assert.ok(sorted[i]!.rating >= sorted[i - 1]!.rating);
});
