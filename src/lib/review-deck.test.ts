import assert from "node:assert/strict";
import test from "node:test";
import {
	calendarMonths,
	type DeckCard,
	deckCards,
	type ReplayInput,
	type ReplayMark,
	sparkPoints,
	tileCard,
} from "./review-deck";

const mark = (kind: ReplayMark["kind"], day = "2026-03-01"): ReplayMark => ({
	kind,
	day,
	label: kind,
	value: kind,
	sub: "",
	big: "1",
});

const replay = (extra: Partial<ReplayInput> = {}): ReplayInput => ({
	first: "2026-01-01",
	last: "2026-03-01",
	days: [{ day: "2026-03-01", charts: 1, ap: 0, fc: 0 }],
	rks: [],
	startRks: null,
	marks: [],
	...extra,
});

const tiles = (improved: string, fresh: string) =>
	["14.0000", improved, fresh, "1", "0", "0", "—", "—"].map((value) => ({
		value,
	}));

test("a deck always has a cover, the days and an end", () => {
	assert.deepEqual(
		deckCards({ replay: replay(), tiles: tiles("0", "0"), hasType: false }),
		["cover", "days", "end"],
	);
});

test("every optional card appears only when its data is there, in a fixed order", () => {
	const full = replay({
		rks: [{ day: "2026-02-01", value: 14.2 }],
		marks: [mark("step"), mark("jump"), mark("fc"), mark("ap")],
	});
	const all: DeckCard[] = [
		"cover",
		"days",
		"rks",
		"charts",
		"ap",
		"fc",
		"jump",
		"step",
		"type",
		"end",
	];
	assert.deepEqual(
		deckCards({ replay: full, tiles: tiles("3", "2"), hasType: true }),
		all,
	);
	const without = (card: DeckCard) => all.filter((c) => c !== card);
	assert.deepEqual(
		deckCards({
			replay: { ...full, rks: [] },
			tiles: tiles("3", "2"),
			hasType: true,
		}),
		without("rks"),
	);
	assert.deepEqual(
		deckCards({ replay: full, tiles: tiles("0", "0"), hasType: true }),
		without("charts"),
	);
	assert.deepEqual(
		deckCards({ replay: full, tiles: tiles("3", "2"), hasType: false }),
		without("type"),
	);
	for (const kind of ["ap", "fc", "jump", "step"] as const) {
		assert.deepEqual(
			deckCards({
				replay: { ...full, marks: full.marks.filter((m) => m.kind !== kind) },
				tiles: tiles("3", "2"),
				hasType: true,
			}),
			without(kind),
		);
	}
});

test("the charts card counts either tile and ignores values that are not whole numbers", () => {
	const has = (improved: string, fresh: string) =>
		deckCards({
			replay: replay(),
			tiles: tiles(improved, fresh),
			hasType: false,
		}).includes("charts");
	assert.equal(has("1", "0"), true);
	assert.equal(has("0", "4"), true);
	assert.equal(has("—", "0"), false);
	assert.equal(has("—", "2"), true);
	assert.equal(has("1.5", "0"), false);
	assert.equal(
		deckCards({ replay: replay(), tiles: [], hasType: false }).includes(
			"charts",
		),
		false,
	);
});

test("each tile opens the card that shows the same fact", () => {
	assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(tileCard), [
		"rks",
		"charts",
		"charts",
		"days",
		"ap",
		"fc",
		"jump",
		"step",
	]);
	assert.equal(tileCard(8), null);
	assert.equal(tileCard(-1), null);
	assert.equal(tileCard(1.5), null);
});

test("the calendar has one row per month from the first to the last, empty months included", () => {
	const months = calendarMonths({
		first: "2026-02-14",
		last: "2026-11-03",
		days: [
			{ day: "2026-02-20", charts: 2, ap: 1, fc: 0 },
			{ day: "2026-02-14", charts: 1, ap: 0, fc: 0 },
			{ day: "2026-05-31", charts: 5, ap: 0, fc: 1 },
			{ day: "2026-11-03", charts: 1, ap: 0, fc: 0 },
		],
	});
	assert.deepEqual(
		months.map((m) => m.month),
		[2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
	);
	assert.ok(months.every((m) => m.year === 2026));
	assert.deepEqual(
		months[0]!.days.map((d) => d.dom),
		[14, 20],
	);
	assert.equal(months[0]!.days[1]!.ap, 1);
	assert.deepEqual(months[1]!.days, []);
	assert.deepEqual(
		months[3]!.days.map((d) => [d.dom, d.charts]),
		[[31, 5]],
	);
	assert.deepEqual(
		months.at(-1)!.days.map((d) => d.dom),
		[3],
	);
});

test("a calendar that starts on the first of January keeps one month for a one-day year", () => {
	const months = calendarMonths({
		first: "2026-01-01",
		last: "2026-01-01",
		days: [{ day: "2026-01-01", charts: 1, ap: 0, fc: 0 }],
	});
	assert.equal(months.length, 1);
	assert.deepEqual(
		[months[0]!.year, months[0]!.month, months[0]!.days[0]!.dom],
		[2026, 1, 1],
	);
});

test("the calendar crosses a year end", () => {
	const months = calendarMonths({
		first: "2025-11-20",
		last: "2026-02-02",
		days: [],
	});
	assert.deepEqual(
		months.map((m) => [m.year, m.month]),
		[
			[2025, 11],
			[2025, 12],
			[2026, 1],
			[2026, 2],
		],
	);
});

test("there is no sparkline without a reading", () => {
	assert.equal(sparkPoints(replay(), 100, 40), null);
	assert.equal(sparkPoints(replay({ startRks: 14 }), 100, 40), null);
});

test("the sparkline starts at the start value and places readings by day", () => {
	const got = sparkPoints(
		{
			first: "2026-01-01",
			last: "2026-01-11",
			startRks: 14,
			rks: [
				{ day: "2026-01-11", value: 15 },
				{ day: "2026-01-06", value: 14.5 },
			],
		},
		100,
		40,
	);
	assert.deepEqual(got, {
		points: [
			[0, 40],
			[50, 20],
			[100, 0],
		],
		start: 14,
		end: 15,
	});
});

test("one reading without a start sits in the middle at its day", () => {
	assert.deepEqual(
		sparkPoints(
			{
				first: "2026-01-01",
				last: "2026-01-05",
				startRks: null,
				rks: [{ day: "2026-01-02", value: 14.2 }],
			},
			80,
			20,
		),
		{ points: [[20, 10]], start: null, end: 14.2 },
	);
});

test("equal values lie flat in the middle and a single-day range puts readings at the end", () => {
	assert.deepEqual(
		sparkPoints(
			{
				first: "2026-04-01",
				last: "2026-04-01",
				startRks: 14,
				rks: [{ day: "2026-04-01", value: 14 }],
			},
			60,
			30,
		),
		{
			points: [
				[0, 15],
				[60, 15],
			],
			start: 14,
			end: 14,
		},
	);
});

test("a lower value sits lower on the sparkline", () => {
	const got = sparkPoints(
		{
			first: "2026-01-01",
			last: "2026-01-03",
			startRks: 15,
			rks: [{ day: "2026-01-03", value: 14 }],
		},
		10,
		10,
	);
	assert.deepEqual(got?.points, [
		[0, 0],
		[10, 10],
	]);
});
