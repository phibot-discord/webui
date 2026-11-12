import assert from "node:assert/strict";
import test from "node:test";
import { currentGroup, navGroupsAt } from "./nav";

test("a page lights up its group", () => {
	assert.equal(currentGroup("/me/b30"), "scores");
	assert.equal(currentGroup("/progress"), "scores");
	assert.equal(currentGroup("/compare"), "scores");
	assert.equal(currentGroup("/targets"), "tools");
	assert.equal(currentGroup("/songs/Aleph0-LeaF"), "tools");
	assert.equal(currentGroup("/phira-mp"), "tools");
	assert.equal(currentGroup("/files"), "files");
	assert.equal(currentGroup("/versions"), "files");
	assert.equal(currentGroup("/account"), undefined);
	assert.equal(currentGroup("/"), undefined);
});

test("the review is listed beside Trend only while the window links it", () => {
	const scores = (now: number | null) =>
		navGroupsAt(now)
			.find((g) => g.id === "scores")
			?.items.map((item) => item.id) ?? [];
	assert.ok(!scores(null).includes("review"));
	assert.ok(!scores(Date.parse("2026-11-30T15:59:59.999Z")).includes("review"));
	assert.deepEqual(scores(Date.parse("2026-11-30T16:00:00.000Z")).slice(-3), [
		"trend",
		"review",
		"compare",
	]);
	assert.ok(scores(Date.parse("2027-01-31T15:59:59.999Z")).includes("review"));
	assert.ok(!scores(Date.parse("2027-01-31T16:00:00.000Z")).includes("review"));
	assert.equal(currentGroup("/2026-recap"), "scores");
	const early = Date.parse("2026-11-11T00:00:00Z");
	const scoresIn = (now: number | null, env: { NODE_ENV: string }) =>
		navGroupsAt(now, env)
			.find((g) => g.id === "scores")
			?.items.map((item) => item.id) ?? [];
	assert.ok(scoresIn(early, { NODE_ENV: "development" }).includes("review"));
	assert.ok(!scoresIn(early, { NODE_ENV: "production" }).includes("review"));
	assert.ok(!scoresIn(null, { NODE_ENV: "development" }).includes("review"));
});
