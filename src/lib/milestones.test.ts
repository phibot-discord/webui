import assert from "node:assert/strict";
import test from "node:test";
import { milestonesOf } from "./milestones";

const C: Record<string, number> = {
	"A.0:AT": 15.4,
	"B.0:IN": 13.2,
	"C.0:AT": 16.1,
	"D.0:IN": 14.6,
};
const constantOf = (id: string, rank: string) => C[`${id}:${rank}`];

test("the first tracked day is the baseline, later firsts become milestones", () => {
	const day1 = "2026-10-01T04:00:00Z";
	const history = {
		"A.0": { AT: [[98.5, 980000, day1, true] as const] },
		"B.0": {
			IN: [[100, 1000000, day1, true] as const],
		},
		"C.0": {
			AT: [
				[97, 960000, "2026-10-03T04:00:00Z", false] as const,
				[99.2, 990000, "2026-10-05T04:00:00Z", true] as const,
			],
		},
		"D.0": { IN: [[100, 1000000, "2026-10-04T04:00:00Z", true] as const] },
	};
	const rks = [
		{ date: day1, value: 15.42 },
		{ date: "2026-10-04T04:00:00Z", value: 15.47 },
		{ date: "2026-10-05T04:00:00Z", value: 15.55 },
	];
	const got = milestonesOf(rks, history, constantOf);
	assert.equal(got.start?.ap, 1);
	assert.equal(got.start?.fc, 2);
	assert.equal(got.start?.rks, 15.42);
	assert.deepEqual(
		got.items.map((m) => [
			m.kind,
			"level" in m ? m.level : "at" in m ? m.at : null,
		]),
		[
			["rks", 15.5],
			["fc", 16],
			["bestDay", null],
			["ap", 14],
		],
	);
});

test("an AP that is also a new FC level shows once, counts cross their thresholds", () => {
	const rows: Record<
		string,
		Record<string, (readonly [number, number, string, boolean])[]>
	> = {};
	const ids = Array.from({ length: 11 }, (_, i) => `S${i}.0`);
	ids.forEach((id, i) => {
		C[`${id}:IN`] = 12 + i * 0.1;
		rows[id] = {
			IN: [
				[
					100,
					1000000,
					i < 9 ? "2026-09-01T02:00:00Z" : `2026-09-0${i - 7}T02:00:00Z`,
					true,
				],
			],
		};
	});
	const got = milestonesOf([], rows, constantOf);
	const kinds = got.items.map((m) => m.kind).sort();
	assert.deepEqual(kinds, ["ap", "apCount", "fcCount"]);
	assert.equal(got.start?.ap, 9);
});

test("no history means no start", () => {
	assert.deepEqual(milestonesOf([], {}, constantOf), {
		start: null,
		items: [],
	});
});
