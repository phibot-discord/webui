import assert from "node:assert/strict";
import test from "node:test";
import {
	paletteText,
	parseTextAnswer,
	TEXT_QUERY_MAX,
	type TextAnswer,
	textQuery,
} from "./text-search";

const HIT = {
	id: "alpa#1",
	title: "The Alpa Pen",
	titleMatch: { before: "The ", match: "Alpa", after: " Pen" },
	snippet: null,
	where: "Chapter I · Glaciaxion",
	href: "/files?view=collection&chapter=c1#i-alpa",
};

test("a query is trimmed, its spaces collapsed, and two characters is the floor", () => {
	assert.deepEqual(textQuery("  alpa \n  pen "), { kind: "ok", q: "alpa pen" });
	assert.deepEqual(textQuery("ab"), { kind: "ok", q: "ab" });
	assert.deepEqual(textQuery("a"), { kind: "short" });
	assert.deepEqual(textQuery(" Ａ "), { kind: "short" });
	assert.deepEqual(textQuery(""), { kind: "short" });
	assert.deepEqual(textQuery(null), { kind: "short" });
	assert.deepEqual(textQuery(undefined), { kind: "short" });
});

test("one Chinese, Japanese or Korean character is a query of its own", () => {
	for (const one of ["塔", "あ", "ア", "한"]) {
		assert.deepEqual(textQuery(` ${one} `), { kind: "ok", q: one });
	}
});

test("a query is at most 64 characters, counted as characters", () => {
	const wide = "𠀀";
	assert.equal(TEXT_QUERY_MAX, 64);
	assert.equal(textQuery("a".repeat(64)).kind, "ok");
	assert.equal(textQuery("a".repeat(65)).kind, "long");
	assert.equal(textQuery(wide.repeat(64)).kind, "ok");
	assert.equal(textQuery(wide.repeat(65)).kind, "long");
	assert.equal(textQuery(`  ${"a".repeat(64)}  `).kind, "ok");
});

test("an answer's groups come back in the palette's order, unknown kinds dropped", () => {
	const groups = parseTextAnswer({
		q: "alpa",
		groups: [
			{ kind: "timeline", hits: [{ ...HIT, id: "e:babel" }], total: 1 },
			{ kind: "songs", hits: [HIT], total: 1 },
			{ kind: "collection", hits: [HIT], total: 1 },
			{ kind: "tips", hits: [{ ...HIT, id: "tip-1" }], total: 1 },
		],
	});
	assert.deepEqual(
		groups?.map((g) => [g.kind, g.hits.map((h) => h.id)]),
		[
			["collection", ["alpa#1"]],
			["tips", ["tip-1"]],
			["timeline", ["e:babel"]],
		],
	);
});

test("a hit with a bad field or a link off the site is dropped, and an empty group with it", () => {
	const groups = parseTextAnswer({
		groups: [
			{
				kind: "collection",
				hits: [
					HIT,
					{ ...HIT, id: "a", href: "https://example.com/x" },
					{ ...HIT, id: "b", href: "//example.com/x" },
					{ ...HIT, id: "c", where: 3 },
					{ ...HIT, id: "d", snippet: { before: "", match: 1, after: "" } },
					{ ...HIT, id: "e", title: "", snippet: null },
					null,
				],
				total: 9,
				more: "/files?view=collection&q=alpa",
			},
			{ kind: "story", hits: [{ ...HIT, href: "javascript:alert(1)" }] },
		],
	});
	assert.deepEqual(groups, [
		{
			kind: "collection",
			hits: [HIT],
			total: 9,
			more: "/files?view=collection&q=alpa",
		},
	]);
});

test("the full-results link is kept only when there are more results than shown", () => {
	const one = (total: unknown, more: unknown) =>
		parseTextAnswer({
			groups: [{ kind: "collection", hits: [HIT], total, more }],
		});
	assert.deepEqual(one(1, "/files?view=collection&q=alpa")?.[0], {
		kind: "collection",
		hits: [HIT],
		total: 1,
	});
	assert.equal(one(0, undefined)?.[0]?.total, 1);
	assert.equal(one("7", undefined)?.[0]?.total, 1);
	assert.equal(one(7, "https://example.com")?.[0]?.more, undefined);
	assert.equal(one(7, "/files?view=collection&q=alpa")?.[0]?.total, 7);
});

test("an answer that is not one reads as nothing", () => {
	assert.equal(parseTextAnswer(undefined), undefined);
	assert.equal(parseTextAnswer(null), undefined);
	assert.equal(parseTextAnswer("groups"), undefined);
	assert.equal(parseTextAnswer({ groups: "x" }), undefined);
	assert.deepEqual(parseTextAnswer({ groups: [] }), []);
});

test("the palette shows an answer only under the query it was for", () => {
	const answer: TextAnswer = {
		q: "alpa pen",
		groups: [{ kind: "collection", hits: [HIT], total: 1 }],
	};
	assert.deepEqual(paletteText(answer, " alpa  pen "), {
		groups: answer.groups,
		waiting: false,
	});
	assert.deepEqual(paletteText(answer, "alpa pe"), {
		groups: [],
		waiting: true,
	});
	assert.deepEqual(paletteText(answer, "alpa pens"), {
		groups: [],
		waiting: true,
	});
	assert.deepEqual(paletteText(null, "alpa"), { groups: [], waiting: true });
});

test("a query too short or too long waits for nothing", () => {
	const answer: TextAnswer = { q: "a", groups: [] };
	assert.deepEqual(paletteText(answer, "a"), { groups: [], waiting: false });
	assert.deepEqual(paletteText(null, ""), { groups: [], waiting: false });
	assert.deepEqual(paletteText(null, "a".repeat(65)), {
		groups: [],
		waiting: false,
	});
});
