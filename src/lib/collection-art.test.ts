import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
	type ArtEntry,
	artIndexOf,
	artRows,
	entryArt,
	entryBefore,
	entryPlace,
	entryTile,
	flagName,
	mergeArtRows,
	osPhase,
} from "./collection-art";

function parseArtIndex(raw: unknown) {
	const rows = artRows(raw);
	return rows && artIndexOf(rows);
}

const PHASE1 = "Assets/Phigros2/Chapter9/Chapter9SelectMusic.unity";
const PHASE2 = "Assets/Phigros2/Chapter9/Chapter9Phase2.unity";

const BEFORE = {
	flag: "C9AboutTheUniverseUnlocked",
	text: {
		en: "Beneath the boundary, the Tower of Babel that <b><color=#00e4ff>humanity</color></b> had raised collapsed again.",
		ja: "<b><color=#00e4ff>人々</color></b>が築き上げたバベルの塔",
		ko: "<b><color=#00e4ff>인간</color></b>들이 세운 바벨탑",
		"zh-CN":
			"七百七十年过去。\n吞噬一切的境界线下，<b><color=#00e4ff>人类</color></b>建起的巴别塔再次倒塌。",
		"zh-TW": "<b><color=#00e4ff>人類</color></b>建起的巴別塔再次倒塌。",
	},
};

function art(id: string, height: number) {
	return {
		file: `collection-art/${id}.jpg`,
		height,
		original: `collection-art/${id}.png`,
		source: `Assets/Chapter9/Arts/${id}.jpg`,
		width: 2048,
	};
}

const TILE = {
	file: "collection-art/blackhole0-tile.png",
	height: 456,
	label: "答案",
	width: 508,
};

const MANIFEST = {
	entries: [
		{
			art: art("nizhidaoma0", 576),
			before: null,
			id: "nizhidaoma0",
			key: "nizhidaoma",
			layout: "banner",
			scene: PHASE1,
			sub: 1,
		},
		{
			art: art("nizhidaoma1", 576),
			before: BEFORE,
			id: "nizhidaoma1",
			key: "nizhidaoma",
			layout: "banner",
			scene: PHASE1,
			sub: 2,
		},
		{
			art: art("liangrenhuihe0", 1152),
			before: null,
			id: "liangrenhuihe0",
			key: "liangrenhuihe",
			layout: "side",
			scene: PHASE1,
			sub: 1,
		},
		{
			art: null,
			before: null,
			id: "heimu10",
			key: "heimu1",
			layout: "text",
			scene: PHASE1,
			sub: 1,
		},
		{
			art: art("thechaos0", 1152),
			before: null,
			id: "thechaos0",
			key: "thechaos",
			layout: "side",
			scene: PHASE2,
			sub: 1,
			tile: null,
		},
		{
			art: art("blackhole0", 1152),
			before: null,
			id: "blackhole0",
			key: "blackhole",
			layout: "side",
			scene: PHASE1,
			sub: 1,
			tile: TILE,
		},
	],
	v: 1,
};

const T = {
	art: "Illustration: {title}",
	artOpen: "Enlarge the illustration for {title}",
	artArea: "Illustration, scroll to pan",
	osPhase: "Chapter 9 map · phase {n}",
	osMap: "Chapter 9 map",
	before: "Before {name} is unlocked",
	tile: "Map tile",
	tileAlt: "Map tile for {title}",
};

const R2 = (key: string) => `https://r2.example.test/${key}`;

function entry(over: Partial<ArtEntry> = {}): ArtEntry {
	return {
		layout: "side",
		scene: PHASE1,
		art: {
			file: "collection-art/liangrenhuihe0.jpg",
			original: "collection-art/liangrenhuihe0.png",
			width: 2048,
			height: 1152,
		},
		before: null,
		tile: null,
		...over,
	};
}

test("the manifest is keyed by entry and keeps layout, scene, art and the pre-unlock text", () => {
	const index = parseArtIndex(MANIFEST);
	assert.ok(index);
	assert.deepEqual(
		[...index.keys()],
		[
			"nizhidaoma#1",
			"nizhidaoma#2",
			"liangrenhuihe#1",
			"heimu1#1",
			"thechaos#1",
			"blackhole#1",
		],
	);
	assert.deepEqual(index.get("liangrenhuihe#1"), {
		layout: "side",
		scene: PHASE1,
		art: {
			file: "collection-art/liangrenhuihe0.jpg",
			original: "collection-art/liangrenhuihe0.png",
			width: 2048,
			height: 1152,
		},
		before: null,
		tile: null,
	});
	assert.deepEqual(index.get("heimu1#1"), {
		layout: "text",
		scene: PHASE1,
		art: null,
		before: null,
		tile: null,
	});
	assert.deepEqual(index.get("blackhole#1")?.tile, TILE);
	assert.deepEqual(index.get("nizhidaoma#2")?.before, BEFORE);
	assert.equal(index.get("nizhidaoma#1")?.art?.height, 576);
});

test("an unreadable manifest is undefined", () => {
	assert.equal(parseArtIndex(null), undefined);
	assert.equal(parseArtIndex([]), undefined);
	assert.equal(parseArtIndex({ ...MANIFEST, v: 2 }), undefined);
	assert.equal(parseArtIndex({ v: 1, entries: {} }), undefined);
	assert.equal(parseArtIndex({ v: 1, entries: [] })?.size, 0);
});

test("rows without a key, a whole sub of 1 or more, or a known layout are dropped", () => {
	const row = MANIFEST.entries[2];
	const index = parseArtIndex({
		v: 1,
		entries: [
			null,
			"liangrenhuihe0",
			{ ...row, key: "" },
			{ ...row, key: 7 },
			{ ...row, sub: 0 },
			{ ...row, sub: 1.5 },
			{ ...row, sub: "1" },
			{ ...row, layout: "vertical" },
			{ ...row, key: "kept" },
			{ ...row, key: "kept", layout: "banner" },
		],
	});
	assert.deepEqual([...(index?.keys() ?? [])], ["kept#1"]);
	assert.equal(index?.get("kept#1")?.layout, "side");
});

test("art is cleared on text rows and when its files or size look wrong", () => {
	const row = MANIFEST.entries[2];
	const artOf = (over: Record<string, unknown>) =>
		parseArtIndex({ v: 1, entries: [{ ...row, ...over }] })?.get(
			"liangrenhuihe#1",
		)?.art;
	const good = art("liangrenhuihe0", 1152);
	assert.ok(artOf({}));
	assert.equal(artOf({ layout: "text" }), null);
	assert.equal(artOf({ art: null }), null);
	assert.equal(artOf({ art: "collection-art/a.jpg" }), null);
	assert.equal(artOf({ art: { ...good, file: "collection/a.jpg" } }), null);
	assert.equal(artOf({ art: { ...good, file: "collection-art/a.png" } }), null);
	assert.equal(
		artOf({ art: { ...good, file: "collection-art/../a.jpg" } }),
		null,
	);
	assert.equal(
		artOf({ art: { ...good, original: "collection-art/a.jpg" } }),
		null,
	);
	assert.equal(artOf({ art: { ...good, width: 0 } }), null);
	assert.equal(artOf({ art: { ...good, height: 1.5 } }), null);
	assert.equal(artOf({ art: { ...good, height: "1152" } }), null);
	const index = parseArtIndex({
		v: 1,
		entries: [{ ...row, art: null, scene: "" }],
	});
	assert.deepEqual(index?.get("liangrenhuihe#1"), {
		layout: "side",
		scene: null,
		art: null,
		before: null,
		tile: null,
	});
});

test("the pre-unlock text needs a flag and at least one language", () => {
	const row = MANIFEST.entries[3];
	const beforeOf = (before: unknown) =>
		parseArtIndex({ v: 1, entries: [{ ...row, before }] })?.get("heimu1#1")
			?.before;
	assert.deepEqual(beforeOf(BEFORE), BEFORE);
	assert.equal(beforeOf(undefined), null);
	assert.equal(beforeOf("text"), null);
	assert.equal(beforeOf({ ...BEFORE, flag: "" }), null);
	assert.equal(beforeOf({ ...BEFORE, flag: 1 }), null);
	assert.equal(beforeOf({ flag: BEFORE.flag }), null);
	assert.equal(
		beforeOf({ flag: BEFORE.flag, text: { en: " ", fr: "x" } }),
		null,
	);
	assert.deepEqual(
		beforeOf({ flag: BEFORE.flag, text: { ja: "x", fr: "y" } }),
		{
			flag: BEFORE.flag,
			text: { ja: "x" },
		},
	);
});

test("the two Chapter 9 maps are phases 1 and 2", () => {
	assert.equal(osPhase(PHASE1), 1);
	assert.equal(osPhase(PHASE2), 2);
	assert.equal(
		osPhase("Assets/Phigros2/Chapter8/Chapter8SelectMusic.unity"),
		undefined,
	);
	assert.equal(osPhase("Chapter9Phase2.unity.bak"), undefined);
	assert.equal(osPhase(null), undefined);
	assert.equal(entryPlace(entry(), T), "Chapter 9 map · phase 1");
	assert.equal(
		entryPlace(entry({ scene: PHASE2 }), T),
		"Chapter 9 map · phase 2",
	);
	assert.equal(
		entryPlace(entry({ scene: "Assets/Other.unity" }), T),
		"Chapter 9 map",
	);
	assert.equal(entryPlace(entry({ scene: null }), T), undefined);
});

test("art shows the JPEG from R2 and opens the PNG at full size", () => {
	assert.deepEqual(entryArt(entry(), "收获", T, R2), {
		src: "https://r2.example.test/collection-art/liangrenhuihe0.jpg",
		full: "https://r2.example.test/collection-art/liangrenhuihe0.png",
		width: 2048,
		height: 1152,
		layout: "side",
		alt: "Illustration: 收获",
		open: "Enlarge the illustration for 收获",
		area: "Illustration, scroll to pan",
	});
	assert.equal(entryArt(entry({ art: null }), "x", T, R2), undefined);
	assert.equal(entryArt(entry({ layout: "text" }), "x", T, R2), undefined);
	assert.equal(
		entryArt(entry(), "x", T, () => undefined),
		undefined,
	);
	const jpegOnly = (key: string) =>
		key.endsWith(".jpg") ? R2(key) : undefined;
	assert.equal(
		entryArt(entry(), "x", T, jpegOnly)?.full,
		"https://r2.example.test/collection-art/liangrenhuihe0.jpg",
	);
});

test("the pre-unlock text follows the page language and falls back to Chinese", () => {
	const placed = entry({ before: BEFORE });
	assert.equal(flagName(BEFORE.flag), "About The Universe");
	assert.deepEqual(entryBefore(placed, "en", T), {
		summary: "Before About The Universe is unlocked",
		body: BEFORE.text.en,
		original: false,
	});
	assert.equal(entryBefore(placed, "zh-CN", T)?.body, BEFORE.text["zh-CN"]);
	assert.equal(entryBefore(placed, "zh-CN", T)?.original, false);
	const chineseOnly = entry({
		before: { flag: BEFORE.flag, text: { "zh-CN": " 只有中文 " } },
	});
	assert.deepEqual(entryBefore(chineseOnly, "en", T), {
		summary: "Before About The Universe is unlocked",
		body: "只有中文",
		original: true,
	});
	const japaneseOnly = entry({
		before: { flag: BEFORE.flag, text: { ja: "日本語" } },
	});
	assert.equal(entryBefore(japaneseOnly, "en", T), undefined);
	assert.equal(entryBefore(entry(), "en", T), undefined);
});

test("a map tile needs a PNG under collection-art, a whole size and a label", () => {
	const row = MANIFEST.entries[3];
	const tileOf = (tile: unknown) =>
		parseArtIndex({ v: 1, entries: [{ ...row, tile }] })?.get("heimu1#1")?.tile;
	assert.deepEqual(tileOf(TILE), TILE);
	assert.deepEqual(tileOf({ ...TILE, label: " 答案 " }), TILE);
	assert.deepEqual(tileOf({ ...TILE, label: "" }), { ...TILE, label: "" });
	assert.equal(tileOf(undefined), null);
	assert.equal(tileOf(null), null);
	assert.equal(tileOf(TILE.file), null);
	assert.equal(
		tileOf({ ...TILE, file: "collection-art/blackhole0.jpg" }),
		null,
	);
	assert.equal(tileOf({ ...TILE, file: "c9s6/blackhole0-tile.png" }), null);
	assert.equal(tileOf({ ...TILE, file: "collection-art/a/b.png" }), null);
	assert.equal(tileOf({ ...TILE, width: 0 }), null);
	assert.equal(tileOf({ ...TILE, height: 456.5 }), null);
	assert.equal(tileOf({ ...TILE, width: "508" }), null);
	assert.equal(tileOf({ ...TILE, label: 1 }), null);
	const { label: _, ...unlabelled } = TILE;
	assert.equal(tileOf(unlabelled), null);
});

test("a text row keeps its tile, and a bad tile leaves the art alone", () => {
	const row = MANIFEST.entries[5];
	const text = parseArtIndex({
		v: 1,
		entries: [{ ...row, layout: "text" }],
	})?.get("blackhole#1");
	assert.equal(text?.art, null);
	assert.deepEqual(text?.tile, TILE);
	const broken = parseArtIndex({
		v: 1,
		entries: [{ ...row, tile: { ...TILE, width: -1 } }],
	})?.get("blackhole#1");
	assert.equal(broken?.tile, null);
	assert.equal(broken?.art?.file, "collection-art/blackhole0.jpg");
});

test("a tile shows its PNG from R2 with the label over it and names the entry", () => {
	const placed = entry({ tile: TILE });
	assert.deepEqual(entryTile(placed, "答案", T, R2), {
		src: "https://r2.example.test/collection-art/blackhole0-tile.png",
		width: 508,
		height: 456,
		label: "答案",
		alt: "Map tile for 答案",
		caption: "Map tile",
	});
	assert.equal(entryTile(entry(), "x", T, R2), undefined);
	assert.equal(
		entryTile(placed, "x", T, () => undefined),
		undefined,
	);
});

test("the overlay replaces the fields it gives and adds entries the manifest lacks", () => {
	const base = [
		{ id: "a0", key: "a", sub: 1, layout: "text", scene: "s", before: null },
		{ id: "b0", key: "b", sub: 1, layout: "text", scene: "s" },
	];
	const merged = mergeArtRows(base, [
		{ id: "a0", before: { flag: "F", text: { en: "x" } } },
		{ id: "c0", key: "c", sub: 1, layout: "text" },
		{ before: { flag: "F", text: { en: "lost" } } },
	]);
	assert.deepEqual(merged, [
		{
			id: "a0",
			key: "a",
			sub: 1,
			layout: "text",
			scene: "s",
			before: { flag: "F", text: { en: "x" } },
		},
		{ id: "b0", key: "b", sub: 1, layout: "text", scene: "s" },
		{ id: "c0", key: "c", sub: 1, layout: "text" },
	]);
	assert.equal(base[0]?.before, null);
	assert.equal(artIndexOf(merged).get("a#1")?.before?.text.en, "x");
	assert.deepEqual(artRows({ v: 1, entries: [1, null, [], { id: "x" }] }), [
		{ id: "x" },
	]);
	assert.equal(artRows({ v: 2, entries: [] }), undefined);
});

test("the live manifest is phi-unpackd's generic one with phi-specials' overlay laid over it", () => {
	let live: unknown;
	let overlay: unknown;
	try {
		live = JSON.parse(
			readFileSync("/tmp/phi-fixtures/collection-art-index.json", "utf8"),
		);
		overlay = JSON.parse(
			readFileSync("/tmp/phi-fixtures/collection-art-specials.json", "utf8"),
		);
	} catch {
		return;
	}
	const rows = artRows(live) ?? [];
	const extra = artRows(overlay) ?? [];
	assert.equal(rows.length, 34);
	const generic = rows
		.filter((row) => row.id !== "blackhole0")
		.map(({ before: _before, tile: _tile, ...rest }) => rest);
	assert.deepEqual(
		artIndexOf(mergeArtRows(generic, extra)),
		parseArtIndex(live),
	);
	assert.notDeepEqual(artIndexOf(generic), parseArtIndex(live));
});
