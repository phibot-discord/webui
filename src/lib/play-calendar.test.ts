import assert from "node:assert/strict";
import test from "node:test";
import type { HistoryRow, ScoreHistoryMap } from "./past-self";
import { onThisDay, type PlayCalendar, playCalendar } from "./play-calendar";

const NOW = Date.parse("2026-11-12T04:00:00Z");
const BASE = "2026-01-01T04:00:00.000Z";

const row = (date: string, score = 980000): HistoryRow => [
	"98.0000",
	score,
	date,
	false,
];

const cellOf = (calendar: PlayCalendar, day: string) =>
	calendar.weeks.flat().find((cell) => cell?.day === day);

test("the calendar ends with the week that holds today", () => {
	const calendar = playCalendar({}, NOW);
	assert.equal(calendar.weeks.length, 53);
	const last = calendar.weeks.at(-1);
	assert.equal(last?.length, 7);
	assert.equal(last?.[3]?.day, "2026-11-12");
	assert.equal(last?.[4], null);
	assert.equal(last?.[5], null);
	assert.equal(last?.[6], null);
	const first = calendar.weeks[0]?.[0];
	assert.ok(first);
	assert.equal(new Date(`${first.day}T00:00:00Z`).getUTCDay(), 1);
	assert.ok(calendar.weeks.every((week) => week.length === 7));
});

test("the first day of the history is a baseline and is not counted", () => {
	const history: ScoreHistoryMap = {
		"A.B.0": { IN: [row("2026-03-01T04:00:00.000Z")] },
		"C.D.0": { AT: [row("2026-03-05T04:00:00.000Z")] },
	};
	const calendar = playCalendar(history, NOW);
	assert.equal(calendar.active, 1);
	assert.equal(calendar.total, 1);
	assert.deepEqual(calendar.best, { day: "2026-03-05", charts: 1 });
	assert.equal(cellOf(calendar, "2026-03-01")?.charts, 0);
	assert.equal(cellOf(calendar, "2026-03-01")?.level, 0);
});

test("a day counts every improved chart once per row", () => {
	const history: ScoreHistoryMap = {
		"A.B.0": {
			IN: [row(BASE), row("2026-03-05T03:00:00.000Z", 990000)],
		},
		"C.D.0": { AT: [row("2026-03-05T06:00:00.000Z")] },
	};
	const calendar = playCalendar(history, NOW);
	assert.equal(cellOf(calendar, "2026-03-05")?.charts, 2);
	assert.equal(calendar.total, 2);
	assert.equal(calendar.active, 1);
});

test("days are Shanghai days", () => {
	const history: ScoreHistoryMap = {
		"A.B.0": { IN: [row(BASE), row("2026-03-01T17:00:00.000Z", 990000)] },
	};
	const calendar = playCalendar(history, NOW);
	assert.equal(cellOf(calendar, "2026-03-01")?.charts, 0);
	assert.equal(cellOf(calendar, "2026-03-02")?.charts, 1);
	assert.deepEqual(calendar.best, { day: "2026-03-02", charts: 1 });
});

test("levels run from 1 to 4 and the busiest day is 4", () => {
	const history: Record<string, Record<string, HistoryRow[]>> = {
		"Base.0": { IN: [row(BASE)] },
	};
	const add = (day: string, n: number) => {
		for (let i = 0; i < n; i++) {
			history[`${day}-${i}.0`] = {
				IN: [row(BASE), row(`${day}T04:00:00.000Z`)],
			};
		}
	};
	add("2026-04-01", 1);
	add("2026-04-02", 3);
	add("2026-04-03", 40);
	const calendar = playCalendar(history, NOW);
	const levels = ["2026-04-01", "2026-04-02", "2026-04-03"].map(
		(day) => cellOf(calendar, day)?.level ?? -1,
	);
	assert.ok(levels.every((level) => level >= 1 && level <= 4));
	assert.ok((levels[0] ?? 0) < (levels[1] ?? 0));
	assert.ok((levels[1] ?? 0) < (levels[2] ?? 0));
	assert.equal(levels[2], 4);
	assert.equal(cellOf(calendar, "2026-04-04")?.level, 0);
	assert.deepEqual(calendar.best, { day: "2026-04-03", charts: 40 });
});

test("an empty history gives an empty calendar", () => {
	const calendar = playCalendar({}, NOW);
	assert.equal(calendar.best, null);
	assert.equal(calendar.active, 0);
	assert.equal(calendar.total, 0);
	assert.ok(
		calendar.weeks.flat().every((cell) => cell === null || cell.level === 0),
	);
});

test("on this day reaches back only as far as the history", () => {
	const older: ScoreHistoryMap = {
		"A.B.0": { IN: [row("2025-06-01T04:00:00.000Z")] },
	};
	assert.deepEqual(onThisDay(older, [], NOW), [
		{ years: 1, day: "2025-11-12", rks: null, charts: 0 },
	]);
	const newer: ScoreHistoryMap = { "A.B.0": { IN: [row(BASE)] } };
	assert.deepEqual(onThisDay(newer, [], NOW), []);
});

test("on this day reports the RKS at the end of that day and the scores improved on it", () => {
	const history: ScoreHistoryMap = {
		"A.B.0": {
			IN: [
				row("2025-01-01T04:00:00.000Z"),
				row("2025-11-12T02:00:00.000Z", 990000),
			],
		},
		"C.D.0": {
			AT: [
				row("2025-01-01T04:00:00.000Z"),
				row("2025-11-12T15:00:00.000Z", 990000),
			],
		},
		"E.F.0": {
			HD: [
				row("2025-01-01T04:00:00.000Z"),
				row("2025-11-12T16:30:00.000Z", 990000),
			],
		},
	};
	const rks = [
		{ date: "2025-01-01T04:00:00.000Z", value: 13.9 },
		{ date: "2025-11-12T02:00:00.000Z", value: 14.1 },
		{ date: "2025-11-12T15:30:00.000Z", value: 14.2371 },
		{ date: "2025-11-12T16:30:00.000Z", value: 14.3 },
	];
	assert.deepEqual(onThisDay(history, rks, NOW), [
		{ years: 1, day: "2025-11-12", rks: 14.2371, charts: 2 },
	]);
});

test("29 February falls back to the 28th", () => {
	const history: ScoreHistoryMap = { "A.B.0": { IN: [row(BASE)] } };
	const got = onThisDay(history, [], Date.parse("2028-02-29T04:00:00Z"));
	assert.equal(got[0]?.years, 1);
	assert.equal(got[0]?.day, "2027-02-28");
	assert.deepEqual(
		got.map((d) => d.day),
		["2027-02-28", "2026-02-28"],
	);
});
