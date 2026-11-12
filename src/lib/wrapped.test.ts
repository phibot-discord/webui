import assert from "node:assert/strict";
import test from "node:test";
import { toolsEn } from "@/i18n/tools-messages";
import { fCompute } from "@/phi/lib/fcompute";
import { dayEndMs, shanghaiDay } from "./past-self";
import {
	type Wrapped,
	wrappedOf,
	wrappedTiles,
	wrappedTimelineOf,
	yearRange,
} from "./wrapped";

const C: Record<string, number> = {
	"A.0:IN": 15,
	"B.0:IN": 14,
	"C.0:AT": 16,
	"D.0:HD": 12,
	"E.0:AT": 16,
};
const constantOf = (id: string, rank: string) => C[`${id}:${rank}`];

type Row = readonly [number, number, string, boolean];

const OLD = "2025-06-01T04:00:00Z";
const ms = (iso: string) => Date.parse(iso);

const review = (
	history: Record<string, Record<string, readonly Row[]>>,
	rks: { date: string; value: number }[] = [],
	year = 2026,
) => wrappedOf({ year, rks, history, constantOf });

test("the year runs from 1 January to 31 December, China time", () => {
	const { start, end } = yearRange(2026);
	assert.equal(new Date(start).toISOString(), "2025-12-31T16:00:00.000Z");
	assert.equal(new Date(end).toISOString(), "2026-12-31T15:59:59.999Z");
	const got = review({
		"A.0": { IN: [[95, 950000, OLD, false]] },
		"B.0": { IN: [[96, 960000, "2025-12-31T15:59:59.999Z", false]] },
		"C.0": { AT: [[97, 970000, "2025-12-31T16:00:00Z", false]] },
		"D.0": { HD: [[98, 980000, "2026-12-31T15:59:59.999Z", false]] },
		"E.0": { AT: [[99, 990000, "2026-12-31T16:00:00Z", false]] },
	});
	assert.equal(got.status, "ok");
	assert.equal(got.newCharts, 2);
	assert.equal(got.activeDays, 2);
	assert.equal(got.last, end);
});

test("an empty history has nothing to review", () => {
	const { start } = yearRange(2026);
	assert.deepEqual(review({}), {
		year: 2026,
		status: "none",
		from: start - 1,
		fromBaseline: false,
		last: null,
		rks: { start: null, end: null },
		improved: 0,
		newCharts: 0,
		activeDays: 0,
		ap: { count: 0, top: null },
		fc: { count: 0, top: null },
		jump: null,
		mostImproved: null,
	});
});

test("a history that began in 2025 compares against the last 2025 values", () => {
	const got = review(
		{
			"A.0": {
				IN: [
					[95, 950000, OLD, false],
					[97, 970000, "2025-11-01T04:00:00Z", false],
					[98, 980000, "2026-03-01T04:00:00Z", false],
				],
			},
			"B.0": { IN: [[96, 960000, OLD, false]] },
			"C.0": { AT: [[90, 900000, "2026-03-01T04:00:00Z", false]] },
			"D.0": {
				HD: [
					[93, 930000, OLD, false],
					[99, 990000, "2025-12-20T04:00:00Z", false],
					[98.5, 985000, "2026-02-01T04:00:00Z", false],
				],
			},
		},
		[
			{ date: OLD, value: 14.5 },
			{ date: "2025-11-01T04:00:00Z", value: 14.6 },
			{ date: "2026-03-01T04:00:00Z", value: 14.7 },
			{ date: "2026-05-01T04:00:00Z", value: 14.75 },
		],
	);
	assert.equal(got.status, "ok");
	assert.equal(got.fromBaseline, false);
	assert.equal(got.from, yearRange(2026).start - 1);
	assert.deepEqual(got.rks, { start: 14.6, end: 14.75 });
	assert.equal(got.improved, 1);
	assert.equal(got.newCharts, 1);
	assert.equal(got.activeDays, 2);
	assert.deepEqual(got.mostImproved?.before, { acc: 97, score: 970000 });
});

test("a history that began in 2026 starts after its first day", () => {
	const got = review(
		{
			"A.0": {
				IN: [
					[95, 950000, "2026-03-10T02:00:00Z", false],
					[96, 960000, "2026-03-10T15:30:00Z", false],
					[97, 970000, "2026-03-12T04:00:00Z", false],
				],
			},
			"B.0": { IN: [[90, 900000, "2026-03-10T12:00:00Z", false]] },
		},
		[
			{ date: "2026-03-10T02:00:00Z", value: 14 },
			{ date: "2026-03-10T15:30:00Z", value: 14.1 },
			{ date: "2026-03-12T04:00:00Z", value: 14.2 },
		],
	);
	assert.equal(got.status, "ok");
	assert.equal(got.fromBaseline, true);
	assert.equal(got.from, dayEndMs("2026-03-10"));
	assert.deepEqual(got.rks, { start: 14.1, end: 14.2 });
	assert.equal(got.improved, 1);
	assert.equal(got.newCharts, 0);
	assert.equal(got.activeDays, 1);
	assert.deepEqual(got.mostImproved?.before, { acc: 96, score: 960000 });
	assert.equal(got.jump?.since, "2026-03-10");
});

test("a history whose only rows are on its first day has nothing to review", () => {
	const got = review(
		{
			"A.0": {
				IN: [
					[95, 950000, "2026-04-01T17:00:00Z", false],
					[97, 970000, "2026-04-02T10:00:00Z", false],
				],
			},
			"C.0": { AT: [[100, 1000000, "2026-04-02T12:00:00Z", true]] },
		},
		[
			{ date: "2026-04-01T17:00:00Z", value: 14 },
			{ date: "2026-04-02T10:00:00Z", value: 14.3 },
		],
	);
	assert.equal(got.status, "none");
	assert.equal(got.fromBaseline, true);
	assert.equal(got.last, null);
	assert.equal(got.newCharts, 0);
	assert.equal(got.ap.count, 0);
	assert.equal(got.jump, null);
});

test("rows after the year are ignored and a year before the history is empty", () => {
	const history = {
		"A.0": {
			IN: [
				[95, 950000, "2026-03-01T04:00:00Z", false],
				[97, 970000, "2026-05-01T04:00:00Z", false],
				[99, 990000, "2027-01-05T04:00:00Z", false],
			] as const,
		},
		"C.0": { AT: [[90, 900000, "2027-02-01T04:00:00Z", false] as const] },
	};
	const rks = [
		{ date: "2026-03-01T04:00:00Z", value: 14 },
		{ date: "2026-05-01T04:00:00Z", value: 14.1 },
		{ date: "2027-01-05T04:00:00Z", value: 14.3 },
	];
	const got = review(history, rks);
	assert.equal(got.status, "ok");
	assert.equal(got.improved, 1);
	assert.equal(got.newCharts, 0);
	assert.equal(got.activeDays, 1);
	assert.equal(got.last, ms("2026-05-01T04:00:00Z"));
	assert.equal(got.rks.end, 14.1);
	const early = review(history, rks, 2025);
	assert.equal(early.status, "none");
	assert.equal(early.fromBaseline, false);
	assert.equal(early.from, yearRange(2025).start - 1);
	assert.deepEqual(early, review({}, [], 2025));
});

test("rows stored newest-first give the same result", () => {
	const history: Record<string, Record<string, Row[]>> = {
		"A.0": {
			IN: [
				[95, 950000, OLD, false],
				[98, 980000, "2026-02-01T04:00:00Z", true],
				[100, 1000000, "2026-07-01T04:00:00Z", true],
			],
		},
		"C.0": {
			AT: [
				[96, 960000, OLD, false],
				[97.5, 975000, "2026-04-01T04:00:00Z", false],
			],
		},
		"D.0": { HD: [[99, 990000, "2026-03-01T04:00:00Z", true]] },
	};
	const rks = [
		{ date: OLD, value: 14 },
		{ date: "2026-02-01T04:00:00Z", value: 14.2 },
		{ date: "2026-04-01T04:00:00Z", value: 14.1 },
		{ date: "2026-07-01T04:00:00Z", value: 14.5 },
	];
	const reversed = Object.fromEntries(
		Object.entries(history).map(([id, levels]) => [
			id,
			Object.fromEntries(
				Object.entries(levels).map(([rank, rows]) => [
					rank,
					[...rows].reverse(),
				]),
			),
		]),
	);
	const sorted = review(history, rks);
	assert.equal(sorted.status, "ok");
	assert.deepEqual(review(reversed, [...rks].reverse()), sorted);
});

test("unknown charts and Legacy rows are ignored", () => {
	const got = review({
		"A.0": {
			IN: [
				[95, 950000, OLD, false],
				[97, 970000, "2026-03-01T04:00:00Z", false],
			],
			LEGACY: [[100, 1000000, "2026-04-01T04:00:00Z", true]],
		},
		"X.0": { IN: [[100, 1000000, "2026-05-01T04:00:00Z", true]] },
	});
	assert.equal(got.status, "ok");
	assert.equal(got.improved, 1);
	assert.equal(got.newCharts, 0);
	assert.equal(got.activeDays, 1);
	assert.equal(got.ap.count, 0);
	assert.equal(got.fc.count, 0);
	assert.equal(got.last, ms("2026-03-01T04:00:00Z"));
});

test("new APs and FCs are counted once and the hardest is the highest constant", () => {
	const got = review({
		"A.0": {
			IN: [
				[97, 970000, OLD, false],
				[98, 985000, "2026-02-01T04:00:00Z", true],
			],
		},
		"C.0": {
			AT: [
				[95, 950000, OLD, false],
				[100, 1000000, "2026-05-01T04:00:00Z", true],
			],
		},
		"E.0": {
			AT: [
				[96, 960000, OLD, false],
				[99, 995000, "2026-03-01T04:00:00Z", true],
				[100, 1000000, "2026-04-01T04:00:00Z", true],
			],
		},
	});
	assert.equal(got.ap.count, 2);
	assert.equal(got.ap.top?.id, "E.0");
	assert.equal(got.ap.top?.t, ms("2026-04-01T04:00:00Z"));
	assert.equal(got.fc.count, 3);
	assert.equal(got.fc.top?.id, "E.0");
	assert.equal(got.fc.top?.t, ms("2026-03-01T04:00:00Z"));
	assert.equal(got.fc.top?.acc, 99);
	assert.equal(got.fc.top?.score, 995000);
});

test("an AP from before the year is not new and a new AP is also a new FC", () => {
	const got = review({
		"A.0": {
			IN: [
				[98, 980000, OLD, false],
				[100, 1000000, "2026-06-01T04:00:00Z", false],
			],
		},
		"B.0": {
			IN: [
				[100, 1000000, OLD, false],
				[100, 1000000, "2026-03-01T04:00:00Z", true],
			],
		},
	});
	assert.equal(got.ap.count, 1);
	assert.equal(got.ap.top?.id, "A.0");
	assert.equal(got.fc.count, 1);
	assert.equal(got.fc.top?.id, "A.0");
	assert.equal(got.improved, 1);
});

test("the biggest jump names both days, skips falls and needs a start value", () => {
	const got = review({}, [
		{ date: OLD, value: 14 },
		{ date: "2026-02-01T04:00:00Z", value: 14.2 },
		{ date: "2026-02-01T10:00:00Z", value: 14.3 },
		{ date: "2026-03-01T04:00:00Z", value: 14.1 },
		{ date: "2026-05-20T04:00:00Z", value: 14.6 },
		{ date: "2026-06-01T04:00:00Z", value: 14.65 },
	]);
	assert.equal(got.status, "ok");
	assert.equal(got.jump?.day, "2026-05-20");
	assert.equal(got.jump?.since, "2026-03-01");
	assert.ok(Math.abs((got.jump?.gain ?? 0) - 0.5) < 1e-9);
	const single = review(
		{
			"A.0": {
				IN: [
					[95, 950000, OLD, false],
					[97, 970000, "2026-04-01T04:00:00Z", false],
				],
			},
		},
		[
			{ date: "2026-04-01T04:00:00Z", value: 14.2 },
			{ date: "2026-04-01T10:00:00Z", value: 14.3 },
		],
	);
	assert.equal(single.status, "ok");
	assert.equal(single.rks.start, null);
	assert.equal(single.rks.end, 14.3);
	assert.equal(single.jump, null);
});

test("the biggest step ignores new charts and picks the largest RKS gain", () => {
	const got = review({
		"A.0": {
			IN: [
				[96, 960000, OLD, false],
				[98, 980000, "2026-03-01T04:00:00Z", false],
			],
		},
		"B.0": {
			IN: [
				[99, 990000, OLD, false],
				[99.5, 995000, "2026-05-01T04:00:00Z", false],
			],
		},
		"C.0": {
			AT: [
				[97, 970000, OLD, false],
				[98.5, 985000, "2026-04-01T04:00:00Z", false],
			],
		},
		"D.0": { HD: [[100, 1000000, "2026-02-01T04:00:00Z", true]] },
	});
	assert.equal(got.newCharts, 1);
	assert.deepEqual(got.mostImproved, {
		id: "A.0",
		rank: "IN",
		c: 15,
		t: ms("2026-03-01T04:00:00Z"),
		acc: 98,
		score: 980000,
		before: { acc: 96, score: 960000 },
		gain: fCompute.rks(98, 15) - fCompute.rks(96, 15),
	});
});

test("tiles show Not enough data for a missing fact and a signed RKS gain", () => {
	const t = toolsEn.wrapped;
	const w: Wrapped = {
		year: 2026,
		status: "ok",
		from: yearRange(2026).start - 1,
		fromBaseline: false,
		last: ms("2026-06-01T04:00:00Z"),
		rks: { start: 14.5, end: 14.75 },
		improved: 3,
		newCharts: 1,
		activeDays: 2,
		ap: { count: 0, top: null },
		fc: { count: 0, top: null },
		jump: null,
		mostImproved: null,
	};
	const tiles = wrappedTiles(w, t, (id) => id, "en");
	assert.deepEqual(
		tiles.map((tile) => tile.label),
		[
			t.rks,
			t.improved,
			t.newCharts,
			t.activeDays,
			t.ap,
			t.fc,
			t.jump,
			t.mostImproved,
		],
	);
	assert.deepEqual(tiles[0], {
		label: t.rks,
		value: "14.5000 → 14.7500",
		sub: "+0.2500",
	});
	assert.deepEqual(tiles[6], { label: t.jump, value: "—", sub: t.thin });
	assert.deepEqual(tiles[7], {
		label: t.mostImproved,
		value: "—",
		sub: t.thin,
	});
	assert.equal(t.thin, "Not enough data");
});

test("there are no tiles when there is nothing to review", () => {
	assert.deepEqual(
		wrappedTiles(review({}), toolsEn.wrapped, (id) => id, "en"),
		[],
	);
});

test("a chart is written level and constant first, so a long name is the part that gets cut", () => {
	const t = toolsEn.wrapped;
	const chart = {
		id: "C.0",
		rank: "AT",
		c: 16,
		t: ms("2026-05-01T04:00:00Z"),
		acc: 100,
		score: 1000000,
		before: { acc: 95, score: 950000 },
	};
	const w: Wrapped = {
		year: 2026,
		status: "ok",
		from: yearRange(2026).start - 1,
		fromBaseline: false,
		last: ms("2026-06-01T04:00:00Z"),
		rks: { start: 14.5, end: 14.75 },
		improved: 2,
		newCharts: 0,
		activeDays: 2,
		ap: { count: 1, top: chart },
		fc: { count: 1, top: chart },
		jump: null,
		mostImproved: {
			id: "A.0",
			rank: "IN",
			c: 15,
			t: ms("2026-03-01T04:00:00Z"),
			acc: 98,
			score: 980000,
			before: { acc: 96, score: 960000 },
			gain: 0.5,
		},
	};
	const tiles = wrappedTiles(w, t, (id) => `Name ${id}`, "en");
	assert.equal(tiles[4]?.sub, "Hardest: AT 16.0 Name C.0");
	assert.deepEqual(tiles[7], {
		label: t.mostImproved,
		value: "Name A.0",
		sub: "IN 15.0 · 96.00% → 98.00%",
	});
});

type Rks = { date: string; value: number }[];
type Rows = Record<string, Record<string, readonly Row[]>>;

const ascending = (list: readonly { day: string }[]) =>
	list.every((entry, i) => i === 0 || list[i - 1]!.day < entry.day);

function checkTimeline(history: Rows, rks: Rks, year = 2026) {
	const wrapped = wrappedOf({ year, rks, history, constantOf });
	const timeline = wrappedTimelineOf({ year, rks, history, constantOf });
	assert.equal(wrapped.status, "ok");
	assert.ok(timeline);
	assert.equal(timeline.days.length, wrapped.activeDays);
	assert.equal(
		timeline.days.reduce((n, d) => n + d.ap, 0),
		wrapped.ap.count,
	);
	assert.equal(
		timeline.days.reduce((n, d) => n + d.fc, 0),
		wrapped.fc.count,
	);
	if (wrapped.rks.end !== null)
		assert.equal(timeline.rks.at(-1)?.value, wrapped.rks.end);
	assert.equal(timeline.startRks, wrapped.rks.start);
	assert.equal(timeline.first, shanghaiDay(wrapped.from + 1));
	assert.equal(timeline.last, shanghaiDay(wrapped.last!));
	assert.ok(ascending(timeline.days));
	assert.ok(ascending(timeline.rks));
	return { wrapped, timeline };
}

test("there is no timeline when there is nothing to review", () => {
	assert.equal(
		wrappedTimelineOf({ year: 2026, rks: [], history: {}, constantOf }),
		null,
	);
	const onlyFirstDay: Rows = {
		"A.0": {
			IN: [
				[95, 950000, "2026-04-01T17:00:00Z", false],
				[97, 970000, "2026-04-02T10:00:00Z", false],
			],
		},
	};
	const rks = [{ date: "2026-04-02T10:00:00Z", value: 14.3 }];
	assert.equal(review(onlyFirstDay, rks).status, "none");
	assert.equal(
		wrappedTimelineOf({ year: 2026, rks, history: onlyFirstDay, constantOf }),
		null,
	);
	assert.equal(
		wrappedTimelineOf({ year: 2025, rks: [], history: {}, constantOf }),
		null,
	);
});

test("a history that began inside the year has a timeline that starts the day after", () => {
	const { wrapped, timeline } = checkTimeline(
		{
			"A.0": {
				IN: [
					[95, 950000, "2026-03-10T02:00:00Z", false],
					[96, 960000, "2026-03-10T15:30:00Z", false],
					[97, 970000, "2026-03-12T04:00:00Z", false],
					[100, 1000000, "2026-03-20T04:00:00Z", true],
				],
			},
			"B.0": {
				IN: [
					[90, 900000, "2026-03-10T12:00:00Z", false],
					[98, 980000, "2026-03-15T04:00:00Z", true],
					[98.5, 985000, "2026-03-15T09:00:00Z", true],
				],
			},
		},
		[
			{ date: "2026-03-10T02:00:00Z", value: 14 },
			{ date: "2026-03-10T15:30:00Z", value: 14.1 },
			{ date: "2026-03-12T04:00:00Z", value: 14.2 },
			{ date: "2026-03-20T04:00:00Z", value: 14.5 },
		],
	);
	assert.equal(wrapped.fromBaseline, true);
	assert.equal(timeline.first, "2026-03-11");
	assert.equal(timeline.last, "2026-03-20");
	assert.equal(timeline.startRks, 14.1);
	assert.deepEqual(timeline.days, [
		{ day: "2026-03-12", charts: 1, ap: 0, fc: 0 },
		{ day: "2026-03-15", charts: 1, ap: 0, fc: 1 },
		{ day: "2026-03-20", charts: 1, ap: 1, fc: 1 },
	]);
	assert.deepEqual(timeline.rks, [
		{ day: "2026-03-12", value: 14.2 },
		{ day: "2026-03-20", value: 14.5 },
	]);
});

test("rks readings on days without a chart record are on the timeline but not among its days", () => {
	const { timeline } = checkTimeline(
		{
			"A.0": {
				IN: [
					[95, 950000, OLD, false],
					[97, 970000, "2026-03-01T04:00:00Z", false],
				],
			},
		},
		[
			{ date: OLD, value: 14 },
			{ date: "2026-03-01T04:00:00Z", value: 14.1 },
			{ date: "2026-04-10T04:00:00Z", value: 14.2 },
			{ date: "2026-05-20T04:00:00Z", value: 14.3 },
			{ date: "2026-05-20T10:00:00Z", value: 14.35 },
			{ date: "2026-06-01T04:00:00Z", value: 14.4 },
		],
	);
	assert.equal(timeline.first, "2026-01-01");
	assert.equal(timeline.last, "2026-06-01");
	assert.equal(timeline.startRks, 14);
	assert.deepEqual(
		timeline.days.map((d) => d.day),
		["2026-03-01"],
	);
	assert.deepEqual(timeline.rks, [
		{ day: "2026-03-01", value: 14.1 },
		{ day: "2026-04-10", value: 14.2 },
		{ day: "2026-05-20", value: 14.35 },
		{ day: "2026-06-01", value: 14.4 },
	]);
});

test("two charts reaching all perfect on the same day are both counted on that day", () => {
	const { wrapped, timeline } = checkTimeline(
		{
			"A.0": {
				IN: [
					[97, 970000, OLD, false],
					[100, 1000000, "2026-05-01T04:00:00Z", true],
				],
			},
			"E.0": {
				AT: [
					[96, 960000, OLD, false],
					[100, 1000000, "2026-05-01T06:00:00Z", true],
				],
			},
			"C.0": {
				AT: [
					[95, 950000, OLD, false],
					[99, 995000, "2026-06-01T04:00:00Z", true],
				],
			},
		},
		[
			{ date: OLD, value: 14 },
			{ date: "2026-06-01T04:00:00Z", value: 14.5 },
		],
	);
	assert.equal(wrapped.ap.count, 2);
	assert.equal(wrapped.fc.count, 3);
	assert.deepEqual(timeline.days, [
		{ day: "2026-05-01", charts: 2, ap: 2, fc: 2 },
		{ day: "2026-06-01", charts: 1, ap: 0, fc: 1 },
	]);
});

test("a chart with two uploads on one day counts once on that day", () => {
	const { timeline } = checkTimeline(
		{
			"A.0": {
				IN: [
					[95, 950000, OLD, false],
					[96, 960000, "2026-03-01T04:00:00Z", false],
					[97, 970000, "2026-03-01T08:00:00Z", false],
					[98, 980000, "2026-03-02T04:00:00Z", false],
				],
			},
			"B.0": {
				IN: [
					[90, 900000, OLD, false],
					[92, 920000, "2026-03-01T05:00:00Z", false],
				],
			},
		},
		[],
	);
	assert.deepEqual(timeline.days, [
		{ day: "2026-03-01", charts: 2, ap: 0, fc: 0 },
		{ day: "2026-03-02", charts: 1, ap: 0, fc: 0 },
	]);
	assert.deepEqual(timeline.rks, []);
	assert.equal(timeline.startRks, null);
});
