import assert from "node:assert/strict";
import test from "node:test";
import {
	ACHIEVEMENT_IDS,
	type Achievement,
	type AchievementChart,
	type AchievementId,
	type AchievementInput,
	achievementsOf,
} from "./achievements";
import type { ChartStatus } from "./chart-status";

function chart(
	id: string,
	c: number,
	status: ChartStatus,
	acc = 0,
	chapter = "",
): AchievementChart {
	return { id, c, status, acc, chapter };
}

function run(input: Partial<AchievementInput>): Achievement[] {
	return achievementsOf({
		charts: [],
		rks: null,
		challenge: 0,
		best: [],
		...input,
	});
}

function pick(items: Achievement[], id: AchievementId): Achievement {
	const found = items.find((a) => a.id === id);
	assert.ok(found, id);
	return found;
}

function many(n: number, status: ChartStatus, c = 13): AchievementChart[] {
	return Array.from({ length: n }, (_, i) => chart(`S${i}.0`, c, status, 100));
}

test("every ladder is returned once, in the fixed order", () => {
	const items = run({});
	assert.equal(items.length, 16);
	assert.deepEqual(
		items.map((a) => a.id),
		[...ACHIEVEMENT_IDS],
	);
});

test("an empty save has reached nothing", () => {
	const items = run({
		charts: [
			chart("A.0", 12, "none", 0, "Ch1"),
			chart("A.0", 15, "none", 0, "Ch1"),
			chart("B.0", 14, "none"),
		],
	});
	for (const item of items) {
		assert.equal(item.done, 0, item.id);
		assert.equal(item.next, item.steps[0], item.id);
	}
});

test("an All Perfect also counts as a full combo and as cleared", () => {
	const items = run({ charts: [chart("A.0", 13, "ap", 100)] });
	assert.equal(pick(items, "ap").have, 1);
	assert.equal(pick(items, "fc").have, 1);
	assert.equal(pick(items, "clear").have, 1);
});

test("steps reached are counted and the next one is named", () => {
	const ap = pick(run({ charts: many(26, "ap") }), "ap");
	assert.equal(ap.have, 26);
	assert.equal(ap.done, 3);
	assert.equal(ap.next, 50);
});

test("the last step of cleared charts is every chart", () => {
	const partly = pick(
		run({ charts: [...many(55, "clear"), ...many(5, "none")] }),
		"clear",
	);
	assert.deepEqual(partly.steps, [50, 60]);
	assert.equal(partly.done, 1);
	assert.equal(partly.next, 60);
	const all = pick(run({ charts: many(60, "clear") }), "clear");
	assert.deepEqual(all.steps, [50, 60]);
	assert.equal(all.done, 2);
	assert.equal(all.next, null);
});

test("a song counts as a full set only when every one of its charts is a full combo", () => {
	const items = run({
		charts: [
			chart("A.0", 12, "fc", 98),
			chart("A.0", 14, "ap", 100),
			chart("B.0", 12, "fc", 98),
			chart("B.0", 14, "clear", 95),
		],
	});
	assert.equal(pick(items, "fullSet").have, 1);
	assert.equal(pick(items, "allAp").have, 0);
});

test("a chapter counts when all its charts are cleared, and songs without a chapter are ignored", () => {
	const items = run({
		charts: [
			chart("A.0", 12, "clear", 95, "Ch1"),
			chart("B.0", 13, "fc", 98, "Ch1"),
			chart("C.0", 12, "clear", 95, "Ch2"),
			chart("D.0", 13, "played", 80, "Ch2"),
			chart("E.0", 14, "ap", 100),
		],
	});
	const chapters = pick(items, "chapters");
	assert.equal(chapters.have, 1);
	assert.deepEqual(chapters.steps, [1, 2]);
	assert.equal(chapters.next, 2);
	assert.equal(pick(items, "chapterFc").have, 0);
});

test("the highest All Perfect is the largest constant among APs", () => {
	const items = run({
		charts: [
			chart("A.0", 12.5, "ap", 100),
			chart("B.0", 15.8, "ap", 100),
			chart("C.0", 14, "ap", 100),
			chart("D.0", 16.2, "fc", 99.1),
		],
	});
	const highAp = pick(items, "highAp");
	assert.equal(highAp.have, 15.8);
	assert.equal(highAp.done, 5);
	assert.equal(highAp.next, 16);
	assert.equal(pick(items, "highFc").have, 16.2);
});

test("the floor is the lowest accuracy of the best 27 and zero with fewer records", () => {
	const best = Array.from({ length: 27 }, (_, i) => 99.9 - i * 0.05);
	const full = pick(run({ best: [...best, 90] }), "floor");
	assert.equal(full.have, Math.min(...best));
	assert.equal(full.done, 3);
	assert.equal(full.next, 99);
	const short = pick(run({ best: best.slice(0, 26) }), "floor");
	assert.equal(short.have, 0);
	assert.equal(short.done, 0);
});

test("the challenge rank splits into colour and level total", () => {
	const items = run({ challenge: 445 });
	assert.equal(pick(items, "challengeColor").have, 4);
	assert.equal(pick(items, "challengeSum").have, 45);
});

test("RKS exactly on a step counts as reached", () => {
	const rks = pick(run({ rks: 15 }), "rks");
	assert.equal(rks.done, 5);
	assert.equal(rks.next, 15.5);
});

test("unplayed charts never count towards two nines", () => {
	const items = run({
		charts: [
			chart("A.0", 13, "none", 99.5),
			chart("B.0", 13, "clear", 99),
			chart("C.0", 13, "clear", 98.9),
		],
	});
	assert.equal(pick(items, "nines").have, 1);
});
