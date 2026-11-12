import assert from "node:assert/strict";
import test from "node:test";
import { pgtiWindow } from "./pgti-window";

type Row = readonly [number, number, string, boolean];

const NOW = Date.parse("2026-11-12T04:00:00Z");

function historyOf(charts: Record<string, string[]>) {
	const history: Record<string, Record<string, Row[]>> = {};
	for (const [id, dates] of Object.entries(charts))
		history[id] = { IN: dates.map((at) => [98, 980000, at, false] as const) };
	return history;
}

const shown = (window: ReturnType<typeof pgtiWindow>) => {
	assert.ok(window);
	return window;
};

test("an empty history has no window", () => {
	assert.equal(pgtiWindow({}, [], NOW), null);
});

test("a long history is cut to the last 365 days", () => {
	const window = shown(
		pgtiWindow(
			historyOf({
				"A.0": ["2024-03-01T04:00:00Z", "2026-02-10T04:00:00Z"],
				"B.0": ["2024-06-15T04:00:00Z", "2026-10-20T04:00:00Z"],
				"C.0": ["2025-11-11T04:00:00Z", "2025-11-12T04:00:00Z"],
			}),
			[],
			NOW,
		),
	);
	assert.equal(window.first, "2025-11-12");
	assert.equal(window.last, "2026-11-12");
	assert.deepEqual(window.days, ["2026-02-10", "2026-10-20"]);
});

test("a young history starts at its first tracked day, which does not count as progress", () => {
	const window = shown(
		pgtiWindow(
			historyOf({
				"A.0": ["2026-09-01T04:00:00Z"],
				"B.0": ["2026-09-01T05:00:00Z", "2026-10-05T04:00:00Z"],
				"C.0": ["2026-09-01T06:00:00Z"],
			}),
			[],
			NOW,
		),
	);
	assert.equal(window.first, "2026-09-01");
	assert.equal(window.last, "2026-11-12");
	assert.deepEqual(window.days, ["2026-10-05"]);
});

test("days are Shanghai days and are listed once, in order", () => {
	const window = shown(
		pgtiWindow(
			historyOf({
				"A.0": ["2026-01-01T04:00:00Z", "2026-10-06T03:00:00Z"],
				"B.0": ["2026-10-05T17:00:00Z", "2026-10-03T10:00:00Z"],
				"C.0": ["2026-10-03T12:00:00Z", "2026-10-04T15:59:59Z"],
			}),
			[],
			NOW,
		),
	);
	assert.equal(window.first, "2026-01-01");
	assert.deepEqual(window.days, ["2026-10-03", "2026-10-04", "2026-10-06"]);
});

test("the RKS at the start is the value at the end of the first day", () => {
	const window = shown(
		pgtiWindow(
			historyOf({
				"A.0": ["2026-09-01T04:00:00Z", "2026-10-05T04:00:00Z"],
			}),
			[
				{ date: "2026-09-01T04:00:00Z", value: 14 },
				{ date: "2026-09-01T15:00:00Z", value: 14.1 },
				{ date: "2026-09-01T16:30:00Z", value: 14.2 },
				{ date: new Date("2026-10-05T04:00:00Z"), value: 14.5 },
				{ date: "2026-11-13T04:00:00Z", value: 16 },
			],
			NOW,
		),
	);
	assert.equal(window.first, "2026-09-01");
	assert.deepEqual(window.rks, { start: 14.1, end: 14.5 });
});

test("rows after now are ignored", () => {
	const window = shown(
		pgtiWindow(
			historyOf({
				"A.0": ["2026-09-01T04:00:00Z", "2026-11-20T04:00:00Z"],
				"B.0": ["2026-11-13T04:00:00Z"],
				"C.0": ["2026-10-05T04:00:00Z"],
			}),
			[],
			NOW,
		),
	);
	assert.equal(window.first, "2026-09-01");
	assert.equal(window.last, "2026-11-12");
	assert.deepEqual(window.days, ["2026-10-05"]);
	assert.equal(
		pgtiWindow(historyOf({ "A.0": ["2026-11-20T04:00:00Z"] }), [], NOW),
		null,
	);
});
