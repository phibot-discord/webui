import assert from "node:assert/strict";
import test from "node:test";
import type { Save } from "@/phi/lib/save";
import type { ChartSummary } from "./charts";
import { progressView, trendEvents, trendPoints } from "./save-views";

const list: ChartSummary[] = [
	{
		id: "a.0",
		song: "Song A",
		composer: "",
		charts: { EZ: [3, 100], HD: [9.5, 300], IN: [14.8, 600] },
	},
	{ id: "b.0", song: "Song B", composer: "", charts: { AT: [16.2, 900] } },
];

const rec = (score: number, acc: number, fc = false) => ({ score, acc, fc });

test("progress lists every catalog chart with the save's status", () => {
	const save = {
		gameRecord: {
			"a.0": [
				rec(1_000_000, 100, true),
				rec(990_000, 99, true),
				rec(650_000, 80),
			],
		},
	} as unknown as Save;
	const { rows, songs } = progressView(save, list);
	assert.deepEqual(
		rows.map(([id, rank, c, status]) => [id, rank, c, status]),
		[
			["a.0", "EZ", 3, "ap"],
			["a.0", "HD", 9.5, "fc"],
			["a.0", "IN", 14.8, "played"],
			["b.0", "AT", 16.2, "none"],
		],
	);
	assert.equal(songs["b.0"], "Song B");
});

test("trend points are sorted and the current save is added once", () => {
	const history = {
		rks: [
			{ date: new Date("2026-10-02T00:00:00Z"), value: 15.2 },
			{ date: new Date("2026-10-01T00:00:00Z"), value: 15.1 },
		],
	};
	const t = new Date("2026-10-03T00:00:00Z").getTime();
	const points = trendPoints(history, { t, rks: 15.3 });
	assert.deepEqual(
		points.map(([, v]) => v),
		[15.1, 15.2, 15.3],
	);
	assert.equal(
		trendPoints(history, { t: points[1]?.[0] ?? 0, rks: 9 }).length,
		2,
	);
});

test("each recorded score becomes an improvement, newest first", () => {
	const events = trendEvents({
		scoreHistory: {
			"a.0": {
				IN: [
					["99.0000", 990_000, "2026-10-05T00:00:00Z", true],
					["97.5000", 970_000, "2026-10-01T00:00:00Z", false],
				],
			},
		},
	});
	assert.equal(events.length, 2);
	assert.equal(events[0]?.after.acc, 99);
	assert.deepEqual(events[0]?.before, { acc: 97.5, score: 970_000 });
	assert.equal(events[1]?.before, null);
});
