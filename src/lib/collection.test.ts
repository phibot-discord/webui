import assert from "node:assert/strict";
import test from "node:test";
import {
	type CollectionIndex,
	type CollectionText,
	chapterHeading,
	chapterShort,
	chapterTip,
	chipName,
	fileItems,
	parseCollectionIndex,
	parseCollectionText,
	pickText,
	searchCollection,
	textKey,
} from "./collection";

const LANGS = (base: string) => ({
	"zh-CN": `${base} 中`,
	"zh-TW": `${base} 繁`,
	en: `${base} en`,
	ja: `${base} ja`,
	ko: `${base} ko`,
});

const INDEX = {
	v: 1,
	chapters: [
		{ id: "ex", kind: "ex", name: LANGS("EX"), label: null, unlock: null },
		{
			id: "c1",
			kind: "main",
			name: LANGS("Glaciaxion"),
			label: LANGS("Chapter I"),
			unlock: null,
		},
		{
			id: "c5",
			kind: "main",
			name: LANGS("NEON"),
			label: LANGS("Chapter V"),
			unlock: "Spasmodic",
		},
	],
	items: [
		{
			key: "alpa",
			chapter: "c1",
			entries: [
				{ sub: 1, date: "770/02/29" },
				{ sub: 2, date: "770/03/01" },
			],
		},
		{ key: "neon", chapter: "c5", entries: [{ sub: 1, date: "" }] },
		{ key: "lost", chapter: null, entries: [{ sub: 1, date: "" }] },
		{ key: "ghost", chapter: "gone", entries: [{ sub: 1, date: "" }] },
	],
};

test("the index names chapters and files items under them", () => {
	const index = parseCollectionIndex(INDEX);
	assert.ok(index);
	assert.deepEqual(
		index.chapters.map((c) => [c.id, c.kind, c.label === null, c.unlock]),
		[
			["ex", "ex", true, null],
			["c1", "main", false, null],
			["c5", "main", false, "Spasmodic"],
		],
	);
	assert.deepEqual(
		index.items.map((i) => [i.key, i.chapter]),
		[
			["alpa", "c1"],
			["neon", "c5"],
			["lost", null],
			["ghost", null],
		],
	);
	const filed = fileItems(index);
	assert.deepEqual(
		filed.chapters.map((c) => [c.chapter.id, c.items.map((i) => i.key)]),
		[
			["ex", []],
			["c1", ["alpa"]],
			["c5", ["neon"]],
		],
	);
	assert.deepEqual(
		filed.unfiled.map((i) => i.key),
		["lost", "ghost"],
	);
});

test("bad chapters, items and entries are dropped; a bad index is unreadable", () => {
	assert.equal(parseCollectionIndex(null), undefined);
	assert.equal(
		parseCollectionIndex({ v: 2, chapters: [], items: [] }),
		undefined,
	);
	assert.equal(
		parseCollectionIndex({ v: 1, chapters: [], items: [] }),
		undefined,
	);
	const index = parseCollectionIndex({
		v: 1,
		chapters: [
			null,
			{ id: "", kind: "main", name: LANGS("x") },
			{ id: "odd", kind: "weird", name: LANGS("x") },
			{ id: "nameless", kind: "main", name: {} },
			{ id: "ok", kind: "side", name: { en: "Fine" }, label: {} },
		],
		items: [
			null,
			{ key: "", entries: [{ sub: 1 }] },
			{ key: "no-entries", entries: [] },
			{
				key: "bad-entry",
				chapter: "ok",
				entries: [{ sub: "1" }, { sub: 2.5 }],
			},
			{
				key: "fine",
				chapter: "ok",
				entries: [
					{ sub: 1 },
					null,
					{ sub: 2, date: 7, type: 0, info: ["Song IN", "840000", 5] },
				],
			},
		],
	});
	assert.deepEqual(
		index?.chapters.map((c) => [c.id, c.label]),
		[["ok", null]],
	);
	assert.deepEqual(index?.items, [
		{
			key: "fine",
			chapter: "ok",
			entries: [
				{ sub: 1, date: "", type: -1, info: [] },
				{ sub: 2, date: "", type: 0, info: ["Song IN", "840000", ""] },
			],
		},
	]);
});

test("a language file is read by key and sub index", () => {
	const text = parseCollectionText({
		v: 1,
		lang: "en",
		entries: {
			"alpa#1": { title: "The Alpa Pen", author: "Geopelia", body: "A pen." },
			"alpa#2": { title: "Clue I" },
			"bad#1": null,
		},
	});
	assert.ok(text);
	assert.deepEqual(text.get(textKey("alpa", 1)), {
		title: "The Alpa Pen",
		author: "Geopelia",
		body: "A pen.",
	});
	assert.deepEqual(text.get(textKey("alpa", 2)), {
		title: "Clue I",
		author: "",
		body: "",
	});
	assert.equal(text.has("bad#1"), false);
	assert.equal(parseCollectionText({ v: 3, entries: {} }), undefined);
	assert.equal(parseCollectionText({ v: 1 }), undefined);
});

test("a name falls back to the original Chinese, and a heading is label and name", () => {
	assert.equal(pickText({ "zh-CN": "原文", en: "Text" }, "en"), "Text");
	assert.equal(pickText({ "zh-CN": "原文" }, "en"), "原文");
	assert.equal(pickText(null, "en"), "");
	const index = parseCollectionIndex(INDEX);
	const [ex, c1] = index?.chapters ?? [];
	assert.ok(ex && c1);
	assert.deepEqual(chapterHeading(c1, "en"), {
		label: "Chapter I en",
		name: "Glaciaxion en",
	});
	assert.deepEqual(chapterHeading(ex, "zh-CN"), { label: "", name: "EX 中" });
});

test("a chapter's short label is its numeral, side story number or kind", () => {
	const short = (id: string, kind: "ex" | "main" | "side" | "extra") =>
		chapterShort({ id, kind }, "Extra");
	assert.equal(short("ex", "ex"), "EX");
	assert.equal(short("c1", "main"), "I");
	assert.equal(short("c4", "main"), "IV");
	assert.equal(short("c8", "main"), "VIII");
	assert.equal(short("c9", "main"), "IX");
	assert.equal(short("c14", "main"), "XIV");
	assert.equal(short("s1", "side"), "S1");
	assert.equal(short("s4", "side"), "S4");
	assert.equal(short("extra", "extra"), "Extra");
	assert.equal(chapterShort({ id: "extra", kind: "extra" }, "外传"), "外传");
	assert.equal(short("finale", "main"), "FINALE");
	assert.equal(short("c0", "main"), "C0");
	assert.equal(short("side", "side"), "SIDE");
});

test("a chapter chip is named by its full title and count, and keeps its visible label", () => {
	const tip = chapterTip(
		{ label: "Chapter IX", name: "Solivault" },
		"35 items",
	);
	assert.equal(tip, "Chapter IX · Solivault · 35 items");
	assert.equal(
		chapterTip({ label: "", name: "Other" }, "2 items"),
		"Other · 2 items",
	);
	assert.equal(chipName("IX", tip), tip);
	assert.equal(
		chipName("S1", "Side story 1 · Lotos · 17 items"),
		"S1 · Side story 1 · Lotos · 17 items",
	);
	assert.equal(
		chipName("IX", "第九章 · 穹顶孤舟 · 35 件"),
		"IX · 第九章 · 穹顶孤舟 · 35 件",
	);
	assert.equal(
		chipName("外传", "外传章节 · 极星卫 · 37 件"),
		"外传章节 · 极星卫 · 37 件",
	);
});

test("the Collection search folds case and width, puts title matches first and cuts a snippet around the match", () => {
	const index = {
		chapters: [
			{ id: "c1", kind: "main", label: {}, name: {} },
			{ id: "c2", kind: "main", label: {}, name: {} },
		],
		items: [
			{
				key: "a",
				chapter: "c2",
				entries: [{ sub: 1, date: "", getType: 0, getSong: 0, info: [] }],
			},
			{
				key: "b",
				chapter: "c1",
				entries: [{ sub: 1, date: "", getType: 0, getSong: 0, info: [] }],
			},
			{
				key: "c",
				chapter: null,
				entries: [{ sub: 2, date: "", getType: 0, getSong: 0, info: [] }],
			},
		],
	} as unknown as CollectionIndex;
	const text: CollectionText = new Map([
		["a#1", { title: "Phigros Story", author: "", body: "" }],
		[
			"b#1",
			{
				title: "Notes",
				author: "",
				body: `${"x".repeat(40)} the PHIGROS logo, and more text after it that runs on and on`,
			},
		],
	]);
	const original: CollectionText = new Map([
		[
			"c#2",
			{ title: "原文", author: "", body: "只有中文的ｐｈｉｇｒｏｓ正文" },
		],
	]);
	const { hits, total } = searchCollection(
		index,
		text,
		original,
		"Phigros",
		"other",
	);
	assert.equal(total, 3);
	assert.deepEqual(
		hits.map((h) => [h.key, h.chapter]),
		[
			["a", "c2"],
			["b", "c1"],
			["c", "other"],
		],
	);
	assert.deepEqual(hits[0]?.titleMatch, {
		before: "",
		match: "Phigros",
		after: " Story",
	});
	assert.equal(hits[1]?.snippet?.match, "PHIGROS");
	assert.ok(hits[1]?.snippet?.before.startsWith("…"));
	assert.ok(hits[1]?.snippet?.after.endsWith("…"));
	assert.equal(hits[2]?.snippet?.match, "ｐｈｉｇｒｏｓ");
	assert.equal(searchCollection(index, text, original, "  ", "other").total, 0);
	assert.equal(
		searchCollection(index, text, original, "phigros", "other", 1).hits.length,
		1,
	);
});
