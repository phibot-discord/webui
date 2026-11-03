import assert from "node:assert/strict";
import test from "node:test";
import {
	chartPoints,
	dayEndMs,
	historyDays,
	parsePastInput,
	recordsAt,
	shanghaiDay,
	valueAt,
} from "./past-self";

test("a past input is me@ and a real day", () => {
	assert.equal(parsePastInput("me@2026-09-01"), "2026-09-01");
	assert.equal(parsePastInput(" ME@2026-09-01 "), "2026-09-01");
	assert.equal(parsePastInput("me@2026-02-30"), undefined);
	assert.equal(parsePastInput("me"), undefined);
	assert.equal(parsePastInput("abc@2026-09-01"), undefined);
});

test("a day ends at midnight in Shanghai", () => {
	const end = dayEndMs("2026-09-01");
	assert.equal(end, Date.parse("2026-09-01T15:59:59.999Z"));
	assert.equal(shanghaiDay(Date.parse("2026-09-01T16:00:00Z")), "2026-09-02");
	assert.equal(shanghaiDay(Date.parse("2026-09-01T15:59:00Z")), "2026-09-01");
});

test("chart points come out oldest first whatever the stored order", () => {
	const points = chartPoints([
		["99.5000", 990000, "2026-09-03T00:00:00Z", true],
		["98.0000", 970000, "2026-09-01T00:00:00Z", false],
		["bad", 1, "nope", false],
	]);
	assert.deepEqual(
		points.map((p) => p[1]),
		[98, 99.5],
	);
});

test("records at a cutoff take each chart's last entry before it", () => {
	const history = {
		"A.0": {
			IN: [
				["99.5000", 990000, "2026-09-03T00:00:00Z", true],
				["98.0000", 970000, "2026-09-01T00:00:00Z", false],
			] as const,
			AT: [["90.0000", 900000, "2026-09-05T00:00:00Z", false]] as const,
		},
		"Gone.0": {
			IN: [["99.0000", 980000, "2026-08-01T00:00:00Z", false]] as const,
		},
	};
	const constants: Record<string, number> = { "A.0:IN": 15, "A.0:AT": 16 };
	const rows = recordsAt(
		history,
		Date.parse("2026-09-02T00:00:00Z"),
		(id, rank) => constants[`${id}:${rank}`],
	);
	assert.equal(rows.length, 1);
	const row = rows[0];
	assert.ok(row);
	const [id, rank, acc, score, fc, constant, rks] = row;
	assert.deepEqual(
		[id, rank, acc, score, fc, constant],
		["A.0", "IN", 98, 970000, false, 15],
	);
	assert.ok(Math.abs(rks - 15 * ((98 - 55) / 45) ** 2) < 1e-9);
});

test("a value at a cutoff is the newest one not after it", () => {
	const list = [
		{ date: "2026-09-03T00:00:00Z", value: 15.2 },
		{ date: "2026-09-01T00:00:00Z", value: 15.0 },
	];
	assert.equal(valueAt(list, Date.parse("2026-09-02T00:00:00Z")), 15.0);
	assert.equal(valueAt(list, Date.parse("2026-08-01T00:00:00Z")), null);
	assert.equal(valueAt(list, Date.parse("2026-10-01T00:00:00Z")), 15.2);
});

test("history days skip the newest day and run newest first", () => {
	const days = historyDays(
		[
			{ date: "2026-09-01T02:00:00Z", value: 15 },
			{ date: "2026-09-05T02:00:00Z", value: 15.1 },
		],
		{ "A.0": { IN: [["99.0000", 980000, "2026-09-03T02:00:00Z", false]] } },
	);
	assert.deepEqual(days, ["2026-09-03", "2026-09-01"]);
});
