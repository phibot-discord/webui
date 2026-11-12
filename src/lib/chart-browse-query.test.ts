import assert from "node:assert/strict";
import test from "node:test";
import {
	type ChartFilters,
	chartQuery,
	chartsHref,
	type FilterChoices,
	parseChartQuery,
	searchParamsOf,
} from "./chart-browse-query";

const choices: FilterChoices = {
	tags: [3, 17],
	chapters: ["Chapter 8", "Single"],
	scores: true,
};
const P = (s: string) => new URLSearchParams(s);
const DEFAULT: ChartFilters = {
	q: "",
	levels: ["IN", "AT"],
	cMin: "",
	cMax: "",
	tag: "",
	chapter: "",
	status: "all",
	sort: { key: "c", desc: true },
};
const FULL: ChartFilters = {
	q: "rrhar il",
	levels: ["HD", "AT"],
	cMin: "15.5",
	cMax: "16",
	tag: "17",
	chapter: "Chapter 8",
	status: "notAp",
	sort: { key: "notes", desc: true },
};

const HOSTILE =
	"q=" +
	encodeURIComponent(`  ${"x".repeat(300)}  `) +
	"&lv=XX&cmin=-1&cmax=99&tag=1;drop&ch=%3Cscript%3E&status=__proto__&sort=constructor&dir=sideways";

test("an address without a query gives the default filters", () => {
	assert.deepEqual(parseChartQuery(P(""), choices), DEFAULT);
});

test("the default filters write no query, and the link is the bare page", () => {
	assert.equal(chartQuery(DEFAULT), "");
	assert.equal(chartsHref(""), "/charts");
	assert.equal(chartsHref("tag=3"), "/charts?tag=3");
});

test("every filter round-trips under its documented name", () => {
	const written = chartQuery(FULL);
	assert.equal(
		written,
		"q=rrhar+il&lv=HD-AT&cmin=15.5&cmax=16&tag=17&ch=Chapter+8&status=notAp&sort=notes",
	);
	assert.deepEqual(parseChartQuery(P(written), choices), FULL);
	assert.equal(
		chartQuery({ ...DEFAULT, q: "café & co" }),
		"q=caf%C3%A9+%26+co",
	);
});

test("a direction is written only when it differs from the column's first click", () => {
	assert.equal(
		chartQuery({ ...DEFAULT, sort: { key: "title", desc: false } }),
		"sort=title",
	);
	assert.equal(
		chartQuery({ ...DEFAULT, sort: { key: "title", desc: true } }),
		"sort=title&dir=desc",
	);
	assert.equal(
		chartQuery({ ...DEFAULT, sort: { key: "c", desc: false } }),
		"dir=asc",
	);
	assert.equal(
		chartQuery({ ...DEFAULT, sort: { key: "notes", desc: true } }),
		"sort=notes",
	);
});

test("levels are read in any case and order, written in game order, and an empty choice is kept", () => {
	assert.deepEqual(parseChartQuery(P("lv=at-ez-AT"), choices).levels, [
		"EZ",
		"AT",
	]);
	assert.equal(chartQuery({ ...DEFAULT, levels: ["AT", "EZ"] }), "lv=EZ-AT");
	assert.equal(chartQuery({ ...DEFAULT, levels: [] }), "lv=");
	assert.deepEqual(parseChartQuery(P("lv="), choices).levels, []);
	assert.deepEqual(parseChartQuery(P("lv=XX"), choices).levels, ["IN", "AT"]);
	assert.deepEqual(parseChartQuery(P("lv=,,,"), choices).levels, ["IN", "AT"]);
	const lower = parseChartQuery(P("lv=in-at"), choices);
	assert.deepEqual(lower.levels, ["IN", "AT"]);
	assert.equal(chartQuery(lower), "");
});

test("hostile values fall back to the defaults", () => {
	assert.deepEqual(parseChartQuery(P(HOSTILE), choices), {
		...DEFAULT,
		q: "x".repeat(100),
	});
	for (const raw of ["1e1", "abc", "18.5", "015.5", "15.555"]) {
		assert.equal(parseChartQuery(P(`cmin=${raw}`), choices).cMin, "");
	}
	assert.equal(parseChartQuery(P("cmin=%2015.5%20"), choices).cMin, "15.5");
	assert.equal(parseChartQuery(P("cmin=18"), choices).cMin, "18");
	assert.equal(parseChartQuery(P("tag=03"), choices).tag, "3");
	assert.equal(parseChartQuery(P("tag=999999"), choices).tag, "");
	assert.equal(parseChartQuery(P("tag=-3"), choices).tag, "");
	assert.equal(parseChartQuery(P("tag=3&tag=17"), choices).tag, "3");
	assert.equal(parseChartQuery(P("status=Played"), choices).status, "all");
	assert.deepEqual(parseChartQuery(P("sort="), choices).sort, {
		key: "c",
		desc: true,
	});
	assert.equal(
		parseChartQuery(P("ch=Chapter%208"), choices).chapter,
		"Chapter 8",
	);
});

test("status and the accuracy sort are ignored for visitors without scores", () => {
	const anon: FilterChoices = { ...choices, scores: false };
	assert.deepEqual(
		parseChartQuery(P("status=played&sort=acc&dir=asc"), anon),
		DEFAULT,
	);
	const notes = parseChartQuery(P("status=played&sort=notes"), anon);
	assert.equal(notes.status, "all");
	assert.deepEqual(notes.sort, { key: "notes", desc: true });
	assert.deepEqual(parseChartQuery(P("sort=acc&dir=asc"), choices).sort, {
		key: "acc",
		desc: false,
	});
});

test("reading what was written gives the same address", () => {
	for (const x of [
		HOSTILE,
		"q=a+b&lv=",
		"cmin=15.5&cmax=1",
		"lv=at-ez&dir=asc&tag=03",
		chartQuery(FULL),
	]) {
		const once = chartQuery(parseChartQuery(P(x), choices));
		assert.equal(chartQuery(parseChartQuery(P(once), choices)), once);
	}
});

test("a page's search params keep the first of repeated values and skip missing ones", () => {
	const got = searchParamsOf({ tag: ["3", "17"], q: "x", none: undefined });
	assert.equal(got.get("tag"), "3");
	assert.equal(got.get("q"), "x");
	assert.equal(got.has("none"), false);
});
