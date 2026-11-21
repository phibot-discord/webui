import assert from "node:assert/strict";
import test from "node:test";
import {
	parseCollectionIndex,
	parseCollectionText,
	searchCollection,
} from "./collection";
import {
	collectionTextHits,
	searchDocs,
	storyDocs,
	TEXT_LIMIT,
	tighten,
	timelineDocs,
	tipDocs,
} from "./text-search-kinds";
import { parseTextsSection } from "./texts";
import { buildTimeline, parseTimelineData } from "./timeline";

const WHERE = new Map([
	["c1", "Chapter I · Glaciaxion"],
	["other", "Other"],
]);

const STORY =
	parseTextsSection({
		v: 1,
		groups: [
			{
				id: "rain",
				title: { zh: "雨", en: "Rain" },
				chapter: "c1",
				lines: [
					{ "zh-CN": "阿尔帕在雨中。", en: "<b>Alpa</b> walks in the rain." },
				],
			},
			{
				id: "letter",
				title: { zh: "阿尔帕的信", en: "Alpa's letter", ja: "アルパの手紙" },
				chapter: "c1",
				lines: [{ "zh-CN": "一封信。", en: "A letter." }],
			},
			{
				id: "night.end",
				title: { zh: "夜", en: "Night" },
				chapter: "c1",
				lines: [{ "zh-CN": "又是阿尔帕。", en: "alpa again." }],
			},
			{
				id: "lost",
				title: { zh: "迷失", en: "Lost" },
				chapter: "gone",
				lines: [{ en: "Alpa is lost." }],
			},
			{
				id: "loose",
				title: { zh: "散落", en: "Loose" },
				lines: [{ en: "Alpa, unfiled." }],
			},
		],
	}) ?? [];

test("title matches come first, each kind in its own order, and the total counts every match", () => {
	const docs = storyDocs(STORY, WHERE, "en", "en");
	const found = searchDocs(docs, "alpa");
	assert.deepEqual(
		found.hits.map((h) => h.id),
		["letter", "rain", "night.end"],
	);
	assert.equal(found.total, 3);
	const [letter, rain] = found.hits;
	assert.deepEqual(letter?.titleMatch, {
		before: "",
		match: "Alpa",
		after: "'s letter",
	});
	assert.equal(letter?.snippet, null);
	assert.equal(rain?.titleMatch, null);
	assert.deepEqual(rain?.snippet, {
		before: "",
		match: "Alpa",
		after: " walks in the rain.",
	});
});

test("nothing matches, or an empty query, gives no hits", () => {
	const docs = storyDocs(STORY, WHERE, "en", "en");
	assert.deepEqual(searchDocs(docs, "zebra"), { hits: [], total: 0 });
	assert.deepEqual(searchDocs(docs, "   "), { hits: [], total: 0 });
	assert.deepEqual(searchDocs([], "alpa"), { hits: [], total: 0 });
});

test("case and width are folded, and the excerpt keeps the text as written", () => {
	const docs = tipDocs(["ＡＬＰＡ walks home.", "Nobody here."]);
	const wide = searchDocs(docs, "alpa");
	assert.deepEqual(wide.hits[0]?.snippet, {
		before: "",
		match: "ＡＬＰＡ",
		after: " walks home.",
	});
	assert.equal(searchDocs(docs, "Ａｌｐａ").total, 1);
	assert.equal(searchDocs(docs, "WALKS").total, 1);
});

test("an excerpt is cut around the match with an ellipsis on each cut side", () => {
	const before = "塔".repeat(30);
	const after = "x".repeat(100);
	const [hit] = searchDocs(tipDocs([`${before}Alpa${after}`]), "alpa").hits;
	assert.equal(hit?.snippet?.before, `…${"塔".repeat(12)}`);
	assert.equal(hit?.snippet?.match, "Alpa");
	assert.equal(hit?.snippet?.after, `${"x".repeat(80)}…`);
});

test("a kind gives at most its limit of hits but counts them all", () => {
	const docs = tipDocs(Array.from({ length: 8 }, (_, n) => `Tip ${n + 1}`));
	const found = searchDocs(docs, "tip");
	assert.equal(TEXT_LIMIT, 5);
	assert.equal(found.hits.length, 5);
	assert.equal(found.total, 8);
	assert.equal(searchDocs(docs, "tip", 2).hits.length, 2);
});

test("tighten shortens only a long lead-in", () => {
	const long = { before: `…${"a".repeat(24)}`, match: "B", after: "c" };
	assert.deepEqual(tighten(long), {
		before: `…${"a".repeat(12)}`,
		match: "B",
		after: "c",
	});
	const short = { before: "…abc", match: "B", after: "c" };
	assert.equal(tighten(short), short);
	assert.equal(tighten(null), null);
	assert.deepEqual(
		tighten({ before: "𠀀".repeat(14), match: "B", after: "" }),
		{
			before: `…${"𠀀".repeat(12)}`,
			match: "B",
			after: "",
		},
	);
});

test("Collection hits link to their item and name their chapter", () => {
	const index = parseCollectionIndex({
		v: 1,
		chapters: [
			{ id: "c1", kind: "main", name: { en: "Glaciaxion" }, label: null },
		],
		items: [
			{ key: "alpa", chapter: "c1", entries: [{ sub: 1 }, { sub: 2 }] },
			{ key: "stray", chapter: null, entries: [{ sub: 1 }] },
		],
	});
	const text = parseCollectionText({
		v: 1,
		entries: {
			"alpa#1": { title: "The Alpa Pen", body: "A pen." },
			"alpa#2": {
				title: "Clue",
				body: `${"Long before the rain, ".repeat(3)}Alpa wrote.`,
			},
			"stray#1": { title: "Stray", body: "Alpa, somewhere." },
		},
	});
	assert.ok(index && text);
	const found = searchCollection(index, text, undefined, "alpa", "other");
	const hits = collectionTextHits(found.hits, WHERE);
	assert.deepEqual(
		hits.map((h) => [h.id, h.where, h.href]),
		[
			[
				"alpa#1",
				"Chapter I · Glaciaxion",
				"/files?view=collection&chapter=c1#i-alpa",
			],
			[
				"alpa#2",
				"Chapter I · Glaciaxion",
				"/files?view=collection&chapter=c1#i-alpa",
			],
			["stray#1", "Other", "/files?view=collection&chapter=other#i-stray"],
		],
	);
	assert.deepEqual(hits[0]?.titleMatch, {
		before: "The ",
		match: "Alpa",
		after: " Pen",
	});
	assert.equal(hits[1]?.snippet?.before, "…e the rain, ");
	assert.equal(collectionTextHits(found.hits, WHERE, 1).length, 1);
});

test("story texts are those filed under a known chapter, in the site's language", () => {
	const en = storyDocs(STORY, WHERE, "en", "en");
	assert.deepEqual(
		en.map((d) => [d.id, d.title, d.where, d.href]),
		[
			[
				"rain",
				"Rain",
				"Chapter I · Glaciaxion",
				"/files?view=collection&chapter=c1#t-rain",
			],
			[
				"letter",
				"Alpa's letter",
				"Chapter I · Glaciaxion",
				"/files?view=collection&chapter=c1#t-letter",
			],
			[
				"night.end",
				"Night",
				"Chapter I · Glaciaxion",
				"/files?view=collection&chapter=c1#t-night-end",
			],
		],
	);
	assert.equal(en[0]?.body, "Alpa walks in the rain.");
	const ja = storyDocs(STORY, WHERE, "ja", "ja");
	assert.deepEqual(
		ja.map((d) => [d.title, d.body]),
		[
			["Rain", "阿尔帕在雨中。"],
			["アルパの手紙", "一封信。"],
			["Night", "又是阿尔帕。"],
		],
	);
	assert.equal(searchDocs(ja, "阿尔帕").total, 2);
});

test("a tip links to its place in the list, its markup left out", () => {
	const docs = tipDocs(["First tip.", "<color=#ff0000>Alpa</color> says hi."]);
	const [hit] = searchDocs(docs, "alpa says").hits;
	assert.deepEqual(hit, {
		id: "tip-2",
		title: "",
		titleMatch: null,
		snippet: { before: "", match: "Alpa says", after: " hi." },
		where: "",
		href: "/files?view=texts&section=tips#tip-2",
	});
});

const TIMELINE = parseTimelineData({
	v: 1,
	eras: [
		{
			id: "now",
			name: { zh: "现代", en: "Now" },
			summary: { zh: "现代", en: "Now" },
			from: 700,
			to: 800,
		},
	],
	events: [
		{
			id: "babel",
			date: "770/03/32",
			source: "official",
			title: { zh: "巴别倒塌", en: "Babel falls" },
			summary: { zh: "阿尔帕离开了城市。", en: "Alpa leaves the city." },
			note: { zh: "注", en: "Seen from afar." },
		},
		{
			id: "rumour",
			date: "771",
			source: "community",
			title: { zh: "阿尔帕传闻", en: "Alpa rumour" },
			summary: { zh: "传闻", en: "A rumour." },
		},
		{
			id: "tower",
			date: "772",
			source: "game",
			title: { zh: "塔", en: "The tower" },
			summary: { zh: "塔很高。", en: "It is tall." },
		},
	],
	terms: [
		{
			id: "alpa",
			kind: "person",
			name: { zh: "阿尔帕", en: "Alpa" },
			summary: { zh: "一位旅人。", en: "A traveller." },
			source: "official",
		},
		{
			id: "gossip",
			kind: "concept",
			name: { zh: "阿尔帕流言", en: "Alpa gossip" },
			summary: { zh: "流言", en: "Gossip." },
			source: "community",
		},
	],
});

const PLACES = {
	timeline: "Timeline",
	setting: "Setting",
	kinds: {
		place: "Places",
		subspace: "Subspaces",
		people: "Peoples",
		group: "Groups",
		person: "People",
		anomaly: "Whims",
		tech: "Technology",
		concept: "Ideas",
		object: "Objects",
		work: "Works",
		event: "Undated events",
	},
};

function timelineView(community: boolean) {
	assert.ok(TIMELINE);
	return buildTimeline(
		TIMELINE,
		{
			index: { chapters: [], items: [] },
			text: new Map(),
			original: undefined,
			chapters: new Map(),
			stories: new Map(),
			clips: new Map(),
		},
		{ locale: "en", thread: undefined, community },
		{
			realApprox: "≈ {date}",
			towerApprox: "≈ {year}",
			wikiRef: "Wiki: {title}",
			unknownDate: "No date",
			otherThread: "Other",
			realBefore: "Before",
			realAfter: "After",
			unplacedShort: "Undated",
		},
	);
}

test("timeline terms and events link to their card; community lore is left out", () => {
	const docs = timelineDocs(timelineView(false), PLACES);
	const found = searchDocs(docs, "alpa");
	assert.deepEqual(
		found.hits.map((h) => [h.id, h.title, h.where, h.href]),
		[
			[
				"t:alpa",
				"Alpa · 阿尔帕",
				"Setting · People",
				"/files?view=timeline&tab=setting&kind=person#t-alpa",
			],
			[
				"e:babel",
				"Babel falls",
				"Timeline · 770/03/32",
				"/files?view=timeline#e-babel",
			],
		],
	);
	assert.equal(found.total, 2);
	assert.deepEqual(found.hits[0]?.titleMatch, {
		before: "",
		match: "Alpa",
		after: " · 阿尔帕",
	});
	assert.equal(searchDocs(docs, "afar").hits[0]?.id, "e:babel");
	assert.equal(searchDocs(docs, "rumour").total, 0);
	assert.equal(searchDocs(docs, "gossip").total, 0);
	assert.equal(searchDocs(docs, "阿尔帕").hits[0]?.id, "t:alpa");
});

test("a term past the first page of its kind links to that page", () => {
	const view = timelineView(false);
	const paged = {
		sections: view.sections,
		terms: view.terms.map((g) => ({
			...g,
			terms: g.terms.map((t) => ({ ...t, page: 2 })),
		})),
	};
	const [hit] = searchDocs(timelineDocs(paged, PLACES), "traveller").hits;
	assert.equal(
		hit?.href,
		"/files?view=timeline&tab=setting&kind=person&p=3#t-alpa",
	);
});

test("a Latin query ranks a match at the start of a word before one inside a word", () => {
	const docs = tipDocs([
		"The kalpa turns.",
		"Alpa waits.",
		"Wiretap found.",
		"Tap twice.",
	]);
	assert.deepEqual(
		searchDocs(docs, "alpa").hits.map((h) => h.id),
		["tip-2", "tip-1"],
	);
	assert.deepEqual(
		searchDocs(docs, "tap").hits.map((h) => h.id),
		["tip-4", "tip-3"],
	);
	const cjk = tipDocs(["像素塔", "塔"]);
	assert.deepEqual(
		searchDocs(cjk, "塔").hits.map((h) => h.id),
		["tip-1", "tip-2"],
	);
});

test("a Collection excerpt that is only the match itself is left out", () => {
	const base = { chapter: "c1", key: "pen", sub: 0, title: "The pen" };
	const [lone, told] = collectionTextHits(
		[
			{
				...base,
				titleMatch: null,
				snippet: { before: "", match: "Alpa", after: "" },
			},
			{
				...base,
				sub: 1,
				titleMatch: null,
				snippet: { before: "", match: "Alpa", after: " waits." },
			},
		],
		WHERE,
	);
	assert.equal(lone?.snippet, null);
	assert.deepEqual(told?.snippet, {
		before: "",
		match: "Alpa",
		after: " waits.",
	});
});
