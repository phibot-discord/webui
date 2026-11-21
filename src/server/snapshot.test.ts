import assert from "node:assert/strict";
import test from "node:test";
import { catalogs } from "@/i18n/server";
import { parseTagVotes } from "@/phi/lib/chart-tag-votes";
import { fCompute } from "@/phi/lib/fcompute";
import type { Save } from "@/phi/lib/save";
import type { SaveHistory } from "@/phi/lib/save-history";
import type { ChartSummary } from "./charts";
import {
	achievementsSnap,
	catalogLookup,
	isSnapView,
	snapLevel,
	suitsSnap,
	typeSnap,
} from "./snapshot";

const info = {
	PlayerId: "Player",
	modifiedAt: { iso: "2026-10-01T00:00:00Z" },
	summary: { rankingScore: 15.2, challengeModeRank: 445 },
};

test("the three new views are known, the level is read strictly", () => {
	for (const view of ["type", "suits", "achievements"])
		assert.equal(isSnapView(view), true);
	assert.equal(isSnapView("table"), false);
	assert.equal(snapLevel(null), undefined);
	assert.equal(snapLevel(""), undefined);
	assert.equal(snapLevel("15"), 15);
	assert.equal(snapLevel("9"), 9);
	for (const bad of ["abc", "1.5", "-3", "999", " 15"])
		assert.equal(snapLevel(bad), null, bad);
});

const typeSongs = (n: number): ChartSummary[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `P${i}.0`,
		song: `Song ${i}`,
		composer: "",
		charts: { IN: [13, 800] },
	}));

function typeHistory(
	songs: ChartSummary[],
): Pick<SaveHistory, "rks" | "scoreHistory"> {
	return {
		scoreHistory: Object.fromEntries(
			songs.map((song) => [
				song.id,
				{
					IN: [
						[95, 950_000, "2026-01-10T04:00:00Z", false],
						[98, 980_000, "2026-06-01T04:00:00Z", true],
					],
				},
			]),
		),
		rks: [
			{ date: new Date("2025-11-01T00:00:00Z"), value: 13.6 },
			{ date: new Date("2026-06-01T04:00:00Z"), value: 14.2 },
		],
	} as unknown as Pick<SaveHistory, "rks" | "scoreHistory">;
}

const now = Date.parse("2026-10-01T00:00:00Z");

test("the type picture carries the rolling type, its name and every axis", () => {
	const songs = typeSongs(12);
	const save = { saveInfo: info } as unknown as Save;
	const snap = typeSnap(save, typeHistory(songs), songs, "en", {
		constantOf: catalogLookup(songs).constantOf,
		now,
	});
	assert.ok(snap);
	const t = catalogs.en.wrapped.pgti;
	const code = snap.data.letters.map((l) => l.letter).join("");
	assert.match(code, /^[PR][EF][SW][MB]$/);
	assert.equal(snap.data.name, t.names[code as keyof typeof t.names]);
	assert.equal(snap.data.title, t.title);
	assert.equal(snap.data.drive?.letter, "G");
	assert.equal(snap.data.axes.length, 5);
	assert.match(snap.data.axes[4]?.fact ?? "", /\+0\.6000/);
	assert.equal(snap.data.axes[3]?.letter, "B");
	assert.equal(snap.data.axes[3]?.trait, t.traits.B);
	assert.equal(snap.data.axes[4]?.trait, t.rolling.traits.G);
	assert.match(snap.data.range, /January 10, 2026/);
	assert.equal(snap.height > 0, true);
});

test("too few records draw no type picture", () => {
	const songs = typeSongs(5);
	const save = { saveInfo: info } as unknown as Save;
	const lookup = { constantOf: catalogLookup(songs).constantOf, now };
	assert.equal(typeSnap(save, typeHistory(songs), songs, "en", lookup), null);
	assert.equal(
		typeSnap(
			save,
			{ scoreHistory: {}, rks: [] } as unknown as Pick<
				SaveHistory,
				"rks" | "scoreHistory"
			>,
			songs,
			"en",
			lookup,
		),
		null,
	);
});

const TREE = [{ id: 10, name: "读谱", children: [{ id: 1, name: "差速" }] }];

function tableWorld(perfect = false) {
	const list: ChartSummary[] = [];
	const gameRecord: Record<string, unknown[]> = {};
	const charts: Record<
		string,
		{ votes: Record<string, Record<number, number>> }
	> = {};
	for (let i = 0; i < 60; i++) {
		const c = Math.round((15 + i * 0.03) * 100) / 100;
		const acc = perfect ? 100 : 99.5 - (c - 15) * 0.6 - (i % 7) * 0.4;
		list.push({
			id: `s${i}.0`,
			song: `Song ${i}`,
			composer: "",
			charts: { IN: [c, 800] },
		});
		gameRecord[`s${i}.0`] = [
			{ rank: "IN", difficulty: c, rks: fCompute.rks(acc, c), acc },
		];
		charts[`s${i}`] = { votes: { IN: { 1: 5 } } };
	}
	const save = {
		gameRecord,
		saveInfo: info,
		getB19: () => ({ phi: [], b19_list: [] }),
	} as unknown as Save;
	return { list, save, votes: parseTagVotes({ sha: "t", tree: TREE, charts }) };
}

test("the table picture falls back to the page's level and takes another level when asked", async () => {
	const { list, save, votes } = tableWorld();
	let asked = 0;
	const history = async () => {
		asked++;
		return undefined;
	};
	const shown = await suitsSnap(save, list, votes, "en", undefined, history);
	assert.ok(shown);
	assert.equal(shown.data.level, 15);
	assert.equal(shown.data.title, "What suits you · Level 15");
	assert.deepEqual(
		shown.data.tiers.map((t) => t.tier),
		["great", "good", "even", "hard", "wall"],
	);
	const tiles = (snap: NonNullable<typeof shown>) =>
		snap.data.tiers.reduce((n, t) => n + t.tiles.length, 0);
	assert.equal(tiles(shown), 34);
	assert.equal(shown.data.count, "34 charts");
	const other = await suitsSnap(save, list, votes, "en", 16, history);
	assert.ok(other);
	assert.equal(other.data.level, 16);
	assert.equal(tiles(other), 26);
	assert.equal(asked, 0);
});

test("a level without charts, missing votes or an all-AP profile without history draw no table", async () => {
	const { list, save, votes } = tableWorld();
	const none = async () => undefined;
	assert.equal(await suitsSnap(save, list, votes, "en", 13, none), null);
	assert.equal(
		await suitsSnap(save, list, undefined, "en", undefined, none),
		null,
	);
	const perfect = tableWorld(true);
	let asked = 0;
	assert.equal(
		await suitsSnap(
			perfect.save,
			perfect.list,
			perfect.votes,
			"en",
			undefined,
			async () => {
				asked++;
				return undefined;
			},
		),
		null,
	);
	assert.equal(asked, 1);
});

const rec = (score: number, acc: number, fc = false) => ({ score, acc, fc });

test("the achievements picture keeps the page's order and wording", () => {
	const list: ChartSummary[] = [
		{
			id: "a.0",
			song: "Song A",
			composer: "",
			charts: { EZ: [3, 100], HD: [9.5, 300], IN: [14.8, 600] },
		},
		{ id: "b.0", song: "Song B", composer: "", charts: { AT: [16.2, 900] } },
	];
	const save = {
		gameRecord: {
			"a.0": [
				rec(1_000_000, 100, true),
				rec(990_000, 99, true),
				rec(650_000, 80),
			],
		},
		saveInfo: info,
		getRecord: () => [],
	} as unknown as Save;
	const snap = achievementsSnap(save, list, "en");
	const t = catalogs.en.achievements;
	assert.equal(snap.data.title, t.title);
	assert.equal(snap.data.items.length, 16);
	const firstDone = snap.data.items.findIndex((i) => i.complete);
	if (firstDone >= 0)
		assert.ok(snap.data.items.slice(firstDone).every((i) => i.complete));
	const open = snap.data.items.filter((i) => !i.complete);
	for (let i = 1; i < open.length; i++)
		assert.ok(open[i - 1]!.share >= open[i]!.share);
	const rks = snap.data.items.find((i) => i.name === t.names.rks);
	assert.equal(rks?.state, "15.2000 now, next step at 15.5000");
	const color = snap.data.items.find((i) => i.name === t.names.challengeColor);
	assert.equal(color?.state, "Gold now, next step at Rainbow");
	assert.equal(color?.steps, "4 of 5 steps");
});
