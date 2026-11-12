import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assetTab, splitTree } from "../lib/assets";
import { getInfo } from "../phi/lib/get-info";
import { buildChartSnapshot, withSideSongs, withSideTrees } from "./charts";
import { parseFoolsManifest } from "./fools";
import { parseRemovedManifest, removedRows, removedSummaries } from "./removed";

const CSV_HEAD =
	"id\tsong\tcomposer\tillustrator\tEZC\tHDC\tINC\tATC\tEZ\tHD\tIN\tAT\n";

async function catalog() {
	const assets = mkdtempSync(join(tmpdir(), "phi-removed-"));
	mkdirSync(join(assets, "info"), { recursive: true });
	writeFileSync(
		join(assets, "info", "info.csv"),
		`${CSV_HEAD}A.x\tSong A\tX\tx\t\t\t\t\t1\t5\t10\t\n`,
	);
	await getInfo.init(assets);
}

const MANIFEST = {
	v: 1,
	songs: [
		{
			id: "A.x.0",
			song: "Song A",
			composer: "X",
			gone: false,
			jacket: false,
			charts: {
				Legacy: { label: "13.0", charter: "c", notes: 700, from: "2.1.4" },
				AT: { label: "?", charter: "", notes: 969, from: "1.6.5" },
			},
		},
		{
			id: "Gone.g",
			song: "Gone",
			composer: "G",
			illustrator: "i",
			gone: true,
			jacket: true,
			charts: {
				EZ: { label: "3.6", charter: "e", notes: 253, from: "1.6.5" },
				"bad level": { label: "1" },
			},
		},
		{ id: "", song: "no id", charts: { EZ: { label: "1" } } },
		{ id: "N.n", song: "no charts", charts: {} },
	],
};

test("the removed manifest keeps any pack level, skips bad rows and adds `.0`", () => {
	const songs = parseRemovedManifest(MANIFEST);
	assert.deepEqual(
		songs.map((s) => [s.id, Object.keys(s.charts), s.gone, s.jacket]),
		[
			["A.x.0", ["Legacy", "AT"], false, false],
			["Gone.g.0", ["EZ"], true, true],
		],
	);
	assert.deepEqual(parseRemovedManifest({ v: 2, songs: [] }), []);
	assert.deepEqual(parseRemovedManifest(null), []);
});

test("removed rows: Phira levels become unscored cells, every level is described", () => {
	const [kept, gone] = removedSummaries(parseRemovedManifest(MANIFEST));
	assert.deepEqual(kept?.charts, { AT: [0, 969, "?"] });
	assert.deepEqual(kept?.removed, {
		Legacy: { from: "2.1.4", label: "13.0", notes: 700 },
		AT: { from: "1.6.5", label: "?", notes: 969 },
	});
	assert.equal(kept?.gone, undefined);
	assert.equal(gone?.gone, true);
	assert.equal(gone?.illustrator, "i");
});

test("removed songs and charts join the browse catalog only", async () => {
	await catalog();
	const ids = [...getInfo.idList];
	const base = buildChartSnapshot("r1", new Map());
	const before = structuredClone(base.list);
	const snap = withSideTrees(base.list, new Map(), [
		removedRows(parseRemovedManifest(MANIFEST)),
	]);
	const list = JSON.parse(snap.json);
	assert.deepEqual(list[0].charts, {
		EZ: [1, null],
		HD: [5, null],
		IN: [10, null],
		AT: [0, 969, "?"],
	});
	assert.deepEqual(Object.keys(list[0].removed), ["Legacy", "AT"]);
	assert.equal(list[1].id, "Gone.g.0");
	assert.deepEqual(base.list, before, "the scoring catalog is untouched");
	getInfo.setSide("removed", [["Gone.g", "Gone.g"]]);
	try {
		assert.deepEqual(getInfo.idList, ids, "no song joins the song tables");
		assert.equal(getInfo.raw("Gone.g.0"), undefined);
		assert.match(
			getInfo.getill("Gone.g", "low").replace(/\\/g, "/"),
			/\/removed\/illLow\/Gone\.g\.png$/,
		);
		assert.doesNotMatch(getInfo.getill("A.x", "low"), /removed/);
	} finally {
		getInfo.setSide("removed", []);
	}
});

test("the song list adds gone songs the tables lack and marks listed ones, never other removed levels", async () => {
	await catalog();
	const base = buildChartSnapshot("r1", new Map());
	const before = structuredClone(base.list);
	const songs = parseRemovedManifest({
		...MANIFEST,
		songs: [
			...MANIFEST.songs,
			{
				id: "A.x",
				song: "Song A",
				composer: "X",
				gone: true,
				charts: { EZ: { label: "1", from: "1.6.5" } },
			},
		],
	});
	const list = withSideSongs(
		base.list,
		{ removed: songs.slice(1), fools: [] },
		new Map(),
	);
	assert.deepEqual(
		list.map((s) => [s.id, s.gone ?? false, Boolean(s.removed)]),
		[
			["A.x.0", true, false],
			["Gone.g.0", true, true],
		],
	);
	assert.deepEqual(list[0]?.charts, base.list[0]?.charts);
	assert.deepEqual(list[1]?.charts, { EZ: [0, 253, "3.6"] });
	assert.deepEqual(
		withSideSongs(
			base.list,
			{ removed: songs.slice(0, 1), fools: [] },
			new Map(),
		),
		base.list,
		"a removed Legacy chart adds nothing",
	);
	assert.deepEqual(base.list, before, "the scoring catalog is untouched");
});

test("special charts join the song list once, after the removed songs, with their illustrator and source version", async () => {
	await catalog();
	const base = buildChartSnapshot("r1", new Map());
	const fools = parseFoolsManifest({
		v: 1,
		songs: [
			{
				id: "Christmas.0",
				stem: "Christmas",
				song: "Christmas",
				composer: "c",
				illustrator: " i ",
				jacket: true,
				charts: { SP: { label: "?", charter: "x", notes: 177, from: "1.2.4" } },
			},
			{ id: "A.x", song: "Song A", charts: { SP: { label: "?" } } },
			{ id: "Gone.g", song: "Gone", charts: { SP: { label: "?" } } },
		],
	});
	assert.equal(fools[0]?.illustrator, "i");
	assert.equal(fools[0]?.charts.SP?.from, "1.2.4");
	assert.equal(fools[1]?.illustrator, undefined);
	const list = withSideSongs(
		base.list,
		{ removed: parseRemovedManifest(MANIFEST), fools },
		new Map(),
	);
	assert.deepEqual(
		list.map((s) => [s.id, s.gone ?? false, s.special ?? false]),
		[
			["A.x.0", false, false],
			["Gone.g.0", true, false],
			["Christmas.0", false, true],
		],
	);
	assert.deepEqual(list[2]?.charts, { SP: [0, 177, "?"] });
	assert.equal(list[2]?.illustrator, "i");
});

test("removed/ is a side tree with a files tab of its own", () => {
	assert.deepEqual(splitTree("removed/phira/Legacy/a-Legacy.pez"), [
		"removed/",
		"phira/Legacy/a-Legacy.pez",
	]);
	assert.deepEqual(splitTree("removedx/a.png"), ["", "removedx/a.png"]);
	assert.equal(assetTab("removed/music/a.ogg"), "removed");
	assert.equal(assetTab("4-1/music/a.ogg"), "fools");
	assert.equal(assetTab("music/a.ogg"), "files");
});

test("a removed song's files go by its stem, which defaults to the id less .0", () => {
	const [kept, gone] = parseRemovedManifest({
		v: 1,
		songs: [
			{ id: "A.x.0", song: "A", charts: { Legacy: { label: "1" } } },
			{
				id: "Destination",
				stem: "Destinaion.x",
				song: "Destination",
				charts: { AT: { label: "15.4" } },
			},
		],
	});
	assert.equal(kept?.stem, "A.x");
	assert.equal(gone?.stem, "Destinaion.x");
	assert.equal(removedSummaries(gone ? [gone] : [])[0]?.stem, "Destinaion.x");
	assert.equal(removedSummaries(kept ? [kept] : [])[0]?.stem, undefined);
});
