import assert from "node:assert/strict";
import test from "node:test";
import type { ViewChapter } from "@/components/CollectionNav";
import type { SearchHit } from "@/lib/collection";
import { parseTextsSection, parseTips } from "@/lib/texts";
import { buildTimeline, parseTimelineData } from "@/lib/timeline";
import { searchTexts, type TextSources } from "./text-search";

const CHAPTERS: ViewChapter[] = [
	{
		id: "c1",
		kind: "main",
		short: "I",
		label: "Chapter I",
		name: "Glaciaxion",
		count: 7,
	},
	{
		id: "other",
		kind: "other",
		short: "Other",
		label: "",
		name: "Other",
		count: 1,
	},
];

const HITS: SearchHit[] = Array.from({ length: 7 }, (_, n) => ({
	chapter: n === 6 ? "other" : "c1",
	key: `item${n}`,
	sub: 1,
	title: `Alpa ${n}`,
	titleMatch: { before: "", match: "Alpa", after: ` ${n}` },
	snippet: null,
}));

const STORY =
	parseTextsSection({
		v: 1,
		groups: [
			{
				id: "rain",
				title: { zh: "雨", en: "Rain" },
				chapter: "c1",
				lines: [{ "zh-CN": "阿尔帕在雨中。", en: "Alpa walks in the rain." }],
			},
			{
				id: "credits",
				title: { zh: "名单", en: "Credits" },
				lines: [{ en: "Alpa, staff." }],
			},
		],
	}) ?? [];

const TIPS = parseTips({
	v: 1,
	langs: { "zh-CN": ["阿尔帕的提示。", "另一条。"], en: ["An Alpa tip."] },
});

const DATA = parseTimelineData({
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
			summary: { zh: "阿尔帕离开了。", en: "Alpa leaves." },
		},
	],
	terms: [],
});

function timeline(available: boolean): TextSources["timeline"] {
	assert.ok(DATA);
	const view = buildTimeline(
		DATA,
		{
			index: { chapters: [], items: [] },
			text: new Map(),
			original: undefined,
			chapters: new Map(),
			stories: new Map(),
			clips: new Map(),
		},
		{ locale: "en", thread: undefined, community: false },
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
	return { available, sections: view.sections, terms: view.terms };
}

function sources(over: Partial<TextSources> = {}): TextSources {
	assert.ok(TIPS);
	return {
		collection: { chapters: CHAPTERS, hits: HITS, total: 7 },
		story: STORY,
		tips: TIPS,
		timeline: timeline(true),
		...over,
	};
}

test("each kind is a group, in order, with the Collection's link to every result", async () => {
	let asked: unknown[] = [];
	const answer = await searchTexts("alpa", "en", async (m, locale, q) => {
		asked = [m.timeline.tabs.setting, locale, q];
		return sources();
	});
	assert.deepEqual(asked, ["Setting", "en", "alpa"]);
	assert.equal(answer.q, "alpa");
	assert.deepEqual(
		answer.groups.map((g) => [g.kind, g.hits.length, g.total, g.more]),
		[
			["collection", 5, 7, "/files?view=collection&q=alpa"],
			["story", 1, 1, undefined],
			["tips", 1, 1, undefined],
			["timeline", 1, 1, undefined],
		],
	);
	const [collection, story, tips, events] = answer.groups;
	assert.deepEqual(
		collection?.hits.map((h) => [h.id, h.where, h.href]).slice(0, 1),
		[
			[
				"item0#1",
				"Chapter I · Glaciaxion",
				"/files?view=collection&chapter=c1#i-item0",
			],
		],
	);
	assert.deepEqual(
		[story?.hits[0]?.where, story?.hits[0]?.href],
		["Chapter I · Glaciaxion", "/files?view=collection&chapter=c1#t-rain"],
	);
	assert.equal(tips?.hits[0]?.href, "/files?view=texts&section=tips#tip-1");
	assert.deepEqual(
		[events?.hits[0]?.where, events?.hits[0]?.href],
		["Timeline · 770/03/32", "/files?view=timeline#e-babel"],
	);
});

test("texts follow the site language, falling back to Simplified Chinese", async () => {
	const answer = await searchTexts("阿尔帕", "ja", async () => sources());
	const tips = answer.groups.find((g) => g.kind === "tips");
	assert.deepEqual(
		tips?.hits.map((h) => h.snippet?.match),
		["阿尔帕"],
	);
	const story = answer.groups.find((g) => g.kind === "story");
	assert.equal(story?.hits[0]?.id, "rain");
	const zh = await searchTexts("另一条", "zh", async () => sources());
	assert.equal(zh.groups.find((g) => g.kind === "tips")?.hits[0]?.id, "tip-2");
});

test("missing sources give no group and no link", async () => {
	const answer = await searchTexts("alpa", "en", async () =>
		sources({
			collection: undefined,
			tips: new Map(),
			timeline: timeline(false),
		}),
	);
	assert.deepEqual(answer, { q: "alpa", groups: [] });
	const few = await searchTexts("alpa", "en", async () =>
		sources({
			collection: { chapters: CHAPTERS, hits: HITS.slice(0, 2), total: 2 },
		}),
	);
	assert.equal(few.groups[0]?.more, undefined);
});

test("a changed source is searched afresh", async () => {
	const collection = { chapters: CHAPTERS, hits: [], total: 0 };
	const first = await searchTexts("drizzle", "en", async () =>
		sources({ collection }),
	);
	assert.deepEqual(first.groups, []);
	const story =
		parseTextsSection({
			v: 1,
			groups: [
				{
					id: "drizzle",
					title: { zh: "细雨", en: "Drizzle" },
					chapter: "c1",
					lines: [{ en: "Light rain." }],
				},
			],
		}) ?? [];
	const second = await searchTexts("drizzle", "en", async () =>
		sources({ collection, story }),
	);
	assert.deepEqual(
		second.groups.map((g) => [g.kind, g.hits[0]?.id]),
		[["story", "drizzle"]],
	);
});
