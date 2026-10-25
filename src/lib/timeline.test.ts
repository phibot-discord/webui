import assert from "node:assert/strict";
import test from "node:test";
import { parseCollectionIndex, parseCollectionText } from "./collection";
import {
	buildTimeline,
	dateLabel,
	detailsIndex,
	eraOf,
	mentions,
	parseDate,
	parseTimelineData,
	realToTower,
	TERM_KINDS,
	type TimelineData,
	type TimelineEvent,
	type TimelineTerm,
	towerToReal,
} from "./timeline";

const COPY = {
	realApprox: "≈ {date}",
	towerApprox: "≈ {year}",
	wikiRef: "Wiki: {title}",
	unknownDate: "No date",
	otherThread: "Other",
	realBefore: "Before",
	realAfter: "After",
	unplacedShort: "Undated",
};

test("dates are read as the game and the wiki write them", () => {
	assert.deepEqual(parseDate("770/03/32"), {
		cal: "tower",
		year: 770,
		month: 3,
		day: 32,
	});
	assert.deepEqual(parseDate("773.A.P.??.??"), { cal: "tower", year: 773 });
	assert.deepEqual(parseDate("770.A.P.??.??"), { cal: "tower", year: 770 });
	assert.deepEqual(parseDate("72 B.P."), { cal: "tower", year: -72 });
	assert.deepEqual(parseDate("-12"), { cal: "tower", year: -12 });
	assert.deepEqual(parseDate("88/07"), { cal: "tower", year: 88, month: 7 });
	assert.deepEqual(parseDate("2091.08.31"), {
		cal: "real",
		year: 2091,
		month: 8,
		day: 31,
	});
	assert.deepEqual(parseDate("2091/06/29"), {
		cal: "real",
		year: 2091,
		month: 6,
		day: 29,
	});
	assert.equal(parseDate("-"), undefined);
	assert.equal(parseDate(""), undefined);
	assert.equal(parseDate("01/09/35"), undefined);
	assert.equal(parseDate("2091/09/32"), undefined);
	assert.equal(parseDate("770/14/01"), undefined);
	assert.equal(parseDate("770/??/05"), undefined);
	assert.equal(parseDate("0"), undefined);
});

test("labels keep the game's own order of year, month and day", () => {
	assert.equal(
		dateLabel({ cal: "tower", year: 770, month: 3, day: 32 }),
		"770/03/32",
	);
	assert.equal(dateLabel({ cal: "tower", year: 773 }), "773 A.P.");
	assert.equal(dateLabel({ cal: "tower", year: -72 }), "72 B.P.");
	assert.equal(dateLabel({ cal: "real", year: 2091, month: 8 }), "2091/08");
});

test("one Tower year passes in one day outside", () => {
	assert.equal(towerToReal(-72), "2089-05-11");
	assert.equal(towerToReal(1), "2089-07-22");
	assert.equal(towerToReal(770), "2091-08-30");
	const back = (raw: string) => {
		const d = parseDate(raw);
		return d ? realToTower(d) : undefined;
	};
	assert.equal(back("2089/05/11"), -72);
	assert.equal(back("2089/07/22"), 1);
	assert.equal(back("2091/08/30"), 770);
	assert.equal(back("2091/06/29"), 708);
	assert.equal(back("2091"), undefined);
	assert.equal(back("770/03/32"), undefined);
});

test("an event names the longest setting term it mentions", () => {
	const term = (id: string, zh: string, en: string): TimelineTerm => ({
		id,
		kind: "concept",
		name: { zh, en },
		aliases: [],
		summary: { zh, en },
		source: "official",
		link: true,
		wiki: [],
		threads: [],
		events: [],
	});
	const terms = [
		term("limbo", "林泊", "Limbo"),
		term("reality", "林泊现实", "Limbo reality"),
		term("tower", "塔", "Tower"),
	];
	assert.deepEqual(mentions(["林泊现实里的林泊"], terms), ["reality", "limbo"]);
	assert.deepEqual(mentions(["Limbos in Limbo reality"], terms), ["reality"]);
	assert.deepEqual(mentions(["塔上的 Towers"], terms), []);
	const umbrella = {
		...term("kinds", "异想分类", "Whim kinds"),
		aliases: ["人类种"],
	};
	const human = term("human", "人类种", "Human-type whims");
	assert.deepEqual(mentions(["人类种志愿者"], [umbrella, human]), ["human"]);
});

test("the R2 timeline file is read as the story-timeline tools write it", () => {
	const data = parseTimelineData({
		v: 1,
		eras: [
			{
				id: "fenluan",
				from: 770,
				to: 773,
				name: { zh: "纷乱代", en: "Chaos" },
			},
			{ id: "huangnian", from: -72, to: 60, name: { zh: "荒年纪" } },
		],
		threads: [{ id: "limbo", name: { zh: "林泊" }, wiki: ["Protected:林泊"] }],
		events: [
			{
				id: "babel",
				date: "770/03/32",
				source: "official",
				title: { zh: "巴别", en: "Babel" },
				summary: { zh: "冰封消失", en: "Glaciaxia is gone" },
				threads: ["limbo"],
				refs: [{ wiki: "Protected:历史" }, { wiki: "猹", community: true }],
				notes: [
					{
						text: { zh: "答疑", en: "Q&A" },
						effect: "adds",
						source: "interview",
						wiki: "谜题保管所:Talk:正言碎语",
					},
				],
			},
			{
				id: "drift",
				date: "",
				era: "fenluan",
				source: "community",
				title: { zh: "漂流" },
				summary: { zh: "无日期" },
			},
			{ id: "broken", source: "rumour", title: { zh: "坏" } },
		],
		terms: [
			{
				id: "cha",
				kind: "anomaly",
				name: { zh: "猹", en: "Cha" },
				summary: { zh: "二级异想", en: "A level-2 whim" },
				source: "community",
				wiki: [{ title: "猹", community: true }],
				events: ["drift"],
			},
			{ id: "nameless", kind: "anomaly", summary: { zh: "无名" } },
		],
	});
	assert.ok(data);
	assert.deepEqual(
		data.eras.map((e) => e.id),
		["huangnian", "fenluan"],
	);
	assert.deepEqual(data.threads[0]?.wiki, [
		{ title: "Protected:林泊", community: false },
	]);
	assert.deepEqual(
		data.events.map((e) => e.id),
		["babel", "drift"],
	);
	assert.deepEqual(data.events[0]?.refs[1], {
		kind: "wiki",
		title: "猹",
		community: true,
	});
	assert.equal(data.events[0]?.notes[0]?.source, "interview");
	assert.equal(data.events[1]?.era, "fenluan");
	assert.equal(data.events[1]?.date, undefined);
	assert.deepEqual(
		data.terms.map((t) => [t.id, t.source, TERM_KINDS.includes(t.kind)]),
		[["cha", "community", true]],
	);
	assert.equal(parseTimelineData({ events: [] }), undefined);
});

test("eras run from their start year until the next one starts", () => {
	const eras: TimelineData["eras"] = (
		[
			["huangnian", -72, 60],
			["shiri", 60, 89],
			["longgong", 90, 286],
			["fenluan", 770, 773],
		] as const
	).map(([id, from, to]) => ({
		id,
		from,
		to,
		name: { zh: id, en: id },
		summary: { zh: "", en: "" },
	}));
	assert.equal(eraOf(eras, -72)?.id, "huangnian");
	assert.equal(eraOf(eras, 59)?.id, "huangnian");
	assert.equal(eraOf(eras, 60)?.id, "shiri");
	assert.equal(eraOf(eras, 100)?.id, "longgong");
	assert.equal(eraOf(eras, 770)?.id, "fenluan");
	assert.equal(eraOf(eras, 773)?.id, "fenluan");
});

const INDEX = parseCollectionIndex({
	v: 1,
	chapters: [
		{ id: "c1", kind: "main", name: { "zh-CN": "冰封世界", en: "Glaciaxion" } },
		{ id: "x", kind: "extra", name: { "zh-CN": "外传", en: "Extra" } },
	],
	items: [
		{
			key: "alpa",
			chapter: "c1",
			entries: [
				{ sub: 1, date: "770/02/29" },
				{ sub: 2, date: "2083/09/03" },
				{ sub: 3, date: "01/09/35" },
				{ sub: 4, date: "770/03/01" },
			],
		},
		{ key: "ship", chapter: "x", entries: [{ sub: 1, date: "156/01/02" }] },
	],
});

const TEXT = parseCollectionText({
	v: 1,
	entries: {
		"alpa#1": { title: "Alpa", author: "", body: "" },
		"alpa#2": { title: "Alpa clue", author: "", body: "" },
	},
});

function later(id: string, raw: string, threads: string[]): TimelineEvent {
	return {
		id,
		raw,
		date: parseDate(raw),
		lane: "tower",
		world: undefined,
		era: undefined,
		span: undefined,
		source: "game",
		inferred: false,
		title: { zh: "穹顶", en: "The Vault" },
		summary: { zh: "穹顶", en: "The Vault" },
		note: undefined,
		notes: [],
		threads,
		chapters: [],
		refs: [{ kind: "wiki", title: "Protected:穹顶", community: false }],
	};
}

const SMALL: TimelineData = {
	eras: [
		{
			id: "old",
			from: -72,
			to: 60,
			name: { zh: "旧", en: "Old" },
			summary: { zh: "", en: "" },
		},
		{
			id: "now",
			from: 770,
			to: 773,
			name: { zh: "今", en: "Now" },
			summary: { zh: "", en: "" },
		},
	],
	threads: [
		{
			id: "a",
			name: { zh: "甲", en: "A" },
			summary: { zh: "甲线", en: "Thread A" },
			when: undefined,
			wiki: [{ title: "Protected:甲", community: false }],
		},
	],
	worlds: [
		{
			id: "w",
			name: { zh: "世界", en: "World" },
			summary: { zh: "", en: "" },
			when: { zh: "剧本写于 156 年", en: "Written in 156" },
			wiki: [],
		},
	],
	chapters: [
		{
			id: "c1",
			span: "770/02/28–771/01/04",
			synopsis: { zh: "冰封", en: "Ice" },
		},
	],
	chapterWorlds: new Map([["x", "w"]]),
	events: [
		{
			id: "babel",
			raw: "770/03/32",
			date: parseDate("770/03/32"),
			lane: "tower",
			world: undefined,
			era: undefined,
			span: undefined,
			source: "official",
			inferred: false,
			title: { zh: "巴别", en: "Babel" },
			summary: { zh: "冰封消失", en: "Glaciaxia is gone" },
			note: undefined,
			notes: [
				{
					text: { zh: "访谈佐证", en: "An interview backs it" },
					effect: "supports",
					source: "official",
					wiki: { title: "谜题保管所:Talk:20940124", community: false },
				},
				{
					text: { zh: "社区说法", en: "A fan reading" },
					effect: "adds",
					source: "community",
					wiki: undefined,
				},
			],
			threads: ["a"],
			chapters: ["c1"],
			refs: [
				{ kind: "wiki", title: "Phigros:巴别", community: false },
				{ kind: "entry", id: "alpa#1" },
			],
		},
		{
			id: "rumour",
			raw: "1",
			date: parseDate("1"),
			lane: "tower",
			world: undefined,
			era: undefined,
			span: undefined,
			source: "community",
			inferred: false,
			title: { zh: "传闻", en: "Rumour" },
			summary: { zh: "传闻", en: "Rumour" },
			note: undefined,
			notes: [],
			threads: [],
			chapters: [],
			refs: [{ kind: "wiki", title: "传闻", community: true }],
		},
		later("vault", "773", ["a"]),
	],
	terms: [
		{
			id: "babel",
			kind: "event",
			name: { zh: "巴别", en: "Babel" },
			aliases: [],
			summary: { zh: "冰封的终结", en: "The end of Glaciaxia" },
			source: "official",
			link: true,
			wiki: [{ title: "Phigros:巴别", community: false }],
			threads: ["a"],
			events: [],
		},
		{
			id: "gossip",
			kind: "concept",
			name: { zh: "流言", en: "Gossip" },
			aliases: [],
			summary: { zh: "流言", en: "Gossip" },
			source: "community",
			link: true,
			wiki: [],
			threads: [],
			events: ["babel"],
		},
	],
};

const SOURCES = {
	index: INDEX ?? { chapters: [], items: [] },
	text: TEXT ?? new Map(),
	original: undefined,
	chapters: new Map([
		["c1", { short: "I", name: "Glaciaxion" }],
		["x", { short: "Extra", name: "Extra" }],
	]),
	stories: new Map(),
	clips: new Map(),
};

test("events and Collection entries land in their era, lane or world", () => {
	const { sections, threads, chapters, map } = buildTimeline(
		SMALL,
		SOURCES,
		{ locale: "en", thread: undefined, community: false },
		COPY,
	);
	assert.deepEqual(
		sections.map((s) => [s.id, s.kind, s.from, s.to]),
		[
			["reality-before", "before", 0, -1],
			["era-now", "era", 0, 1],
			["world-w", "world", 2, 1],
			["unplaced", "unplaced", 2, 1],
		],
	);
	const now = sections[1];
	assert.equal(now?.years[0]?.label, "770 A.P.");
	assert.equal(now?.years[0]?.real, "≈ 2091-08-30");
	assert.equal(now?.years[0]?.gap, undefined);
	assert.equal(now?.years[1]?.gap, 3);
	const babel = now?.years[0]?.events[0];
	assert.equal(babel?.when, "770/03/32");
	assert.equal(babel?.index, 0);
	assert.deepEqual(
		babel?.refs.map((r) => [r.label, r.href]),
		[
			[
				"Wiki: 巴别",
				"https://wiki.pigeon-games.com/index.php?title=Phigros:巴别",
			],
			["Alpa", "/files?view=collection&chapter=c1#i-alpa"],
		],
	);
	assert.deepEqual(
		babel?.notes.map((n) => [n.text, n.effect, n.ref?.label]),
		[["An interview backs it", "supports", "Wiki: 谜题保管所:Talk:20940124"]],
	);
	assert.deepEqual(babel?.terms, [
		{ id: "babel", anchor: "t-babel", name: "Babel", kind: "event", page: 0 },
	]);
	const vault = now?.years[1]?.events[0];
	assert.deepEqual(
		[vault?.when, vault?.full, vault?.index],
		["", "773 A.P.", 1],
	);
	assert.deepEqual(now?.years[0]?.days, [
		{
			when: "03/01",
			entries: [
				{
					id: "alpa#4",
					title: "alpa",
					href: "/files?view=collection&chapter=c1#i-alpa",
					chapter: "I",
				},
			],
		},
	]);
	assert.equal(sections[0]?.years[0]?.label, "2083");
	assert.equal(sections[0]?.years[0]?.days[0]?.entries[0]?.title, "Alpa clue");
	assert.equal(sections[2]?.years[0]?.label, "Written in 156");
	assert.equal(sections[2]?.years[0]?.days[0]?.when, "01/02");
	assert.equal(sections[3]?.years[0]?.days[0]?.when, "01/09/35");
	assert.deepEqual(threads, [
		{
			id: "a",
			name: "A",
			summary: "Thread A",
			count: 2,
			wiki: [
				{
					kind: "wiki",
					label: "Wiki: 甲",
					href: "https://wiki.pigeon-games.com/index.php?title=Protected:甲",
					external: true,
					community: false,
				},
			],
		},
	]);
	assert.deepEqual(map, {
		count: 2,
		rows: [
			{
				id: "a",
				name: "A",
				first: 0,
				last: 1,
				dots: [
					{ i: 0, source: "official" },
					{ i: 1, source: "game" },
				],
			},
		],
		links: [],
	});
	assert.deepEqual(chapters, [
		{
			id: "c1",
			short: "I",
			name: "Glaciaxion",
			href: "/files?view=collection&chapter=c1",
			span: "770/02/28–771/01/04",
			synopsis: "Ice",
			first: "e-babel",
		},
	]);
});

test("Limbo-reality events show the Tower year their day falls on", () => {
	const data: TimelineData = {
		...SMALL,
		events: [
			{ ...later("treasure", "2091/06/29", []), lane: "real" },
			{ ...later("radio", "2079/09/06", []), lane: "real" },
		],
	};
	const { sections } = buildTimeline(
		data,
		{ ...SOURCES, index: { chapters: [], items: [] } },
		{ locale: "en", thread: undefined, community: false },
		COPY,
	);
	assert.deepEqual(
		sections.map((s) => s.id),
		["reality-before", "reality-after"],
	);
	assert.equal(sections[0]?.years[0]?.events[0]?.tower, undefined);
	assert.equal(sections[1]?.years[0]?.events[0]?.tower, "≈ 708 A.P.");
});

test("a thread hides the entry lists, and community lore waits to be asked for", () => {
	const picked = buildTimeline(
		SMALL,
		SOURCES,
		{ locale: "zh", thread: "a", community: false },
		COPY,
	);
	assert.deepEqual(
		picked.sections.map((s) => s.id),
		["era-now"],
	);
	assert.deepEqual(picked.chapters, []);
	assert.equal(picked.sections[0]?.years[0]?.days.length, 0);
	assert.equal(picked.sections[0]?.years[0]?.events[0]?.title, "巴别");
	assert.deepEqual(
		picked.terms.map((g) => [g.kind, g.terms.map((t) => [t.id, t.alt])]),
		[["event", [["babel", "Babel"]]]],
	);
	const all = buildTimeline(
		SMALL,
		SOURCES,
		{ locale: "en", thread: undefined, community: true },
		COPY,
	);
	assert.equal(all.sections[1]?.id, "era-old");
	assert.equal(all.sections[1]?.years[0]?.events[0]?.source, "community");
	const babel = all.sections[2]?.years[0]?.events[0];
	assert.equal(babel?.notes.length, 2);
	assert.deepEqual(
		babel?.terms.map((t) => t.id),
		["babel", "gossip"],
	);
	assert.deepEqual(
		all.map.rows.map((r) => [r.id, r.name, r.first]),
		[
			["a", "A", 1],
			["", "Other", 0],
		],
	);
	assert.deepEqual(
		all.terms.flatMap((g) => g.terms.map((t) => [t.id, t.events.length])),
		[
			["gossip", 1],
			["babel", 1],
		],
	);
});

test("an opened card finds its details by event or term id", () => {
	const all = buildTimeline(
		SMALL,
		SOURCES,
		{ locale: "en", thread: undefined, community: true },
		COPY,
	);
	const { events, terms, threads } = detailsIndex(all.sections, all.terms);
	const babel = all.sections[2]?.years[0]?.events[0];
	assert.ok(babel);
	assert.deepEqual(events.get(babel.id), {
		terms: babel.terms,
		notes: babel.notes,
		refs: babel.refs,
	});
	const term = all.terms.flatMap((g) => g.terms).find((t) => t.id === "babel");
	assert.ok(term);
	assert.deepEqual(terms.get("babel"), {
		events: term.events,
		refs: term.refs,
	});
	assert.equal(events.get("missing"), undefined);
	const inThread = all.sections
		.flatMap((s) => s.years.flatMap((y) => y.events))
		.filter((e) => e.threads.some((th) => th.id === "a"))
		.map((e) => ({ anchor: e.anchor, title: e.title, when: e.full }));
	assert.ok(inThread.length);
	assert.deepEqual(threads.get("a"), { events: inThread });
});

test("an era with no year keeps its events, and interview notes always show", () => {
	const data: TimelineData = {
		...SMALL,
		events: [
			{
				...later("drift", "", ["a"]),
				era: "old",
				notes: [
					{
						text: { zh: "deathMark 说", en: "deathMark says so" },
						effect: "adds",
						source: "interview",
						wiki: { title: "谜题保管所:Talk:20931232", community: false },
					},
				],
			},
		],
		terms: [
			{
				...(SMALL.terms[1] as TimelineTerm),
				name: { zh: "穹顶", en: "The Vault" },
				events: [],
			},
		],
	};
	const { sections } = buildTimeline(
		data,
		{ ...SOURCES, index: { chapters: [], items: [] } },
		{ locale: "en", thread: undefined, community: false },
		COPY,
	);
	assert.deepEqual(
		sections.map((s) => s.id),
		["era-old"],
	);
	const drift = sections[0]?.years[0]?.events[0];
	assert.equal(sections[0]?.years[0]?.label, "No date");
	assert.deepEqual(
		drift?.notes.map((n) => [n.source, n.text]),
		[["interview", "deathMark says so"]],
	);
	assert.deepEqual(drift?.terms, []);
});
