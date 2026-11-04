import assert from "node:assert/strict";
import test from "node:test";
import { timelineDays } from "./profile-timeline";

const at = (iso: string) => Date.parse(iso);

test("timeline days run from the first day to the day before today, at most six", () => {
	const days = timelineDays(
		at("2026-09-07T03:00:00Z"),
		at("2026-11-04T10:00:00Z"),
	);
	assert.equal(days[0], "2026-09-07");
	assert.equal(days.at(-1), "2026-11-03");
	assert.equal(days.length, 5);
	assert.deepEqual([...days].sort(), days);
});

test("history from today alone has no earlier days", () => {
	const now = at("2026-11-04T10:00:00Z");
	assert.deepEqual(timelineDays(now - 3_600_000, now), []);
	assert.deepEqual(timelineDays(at("2026-11-03T10:00:00Z"), now), [
		"2026-11-03",
	]);
});
