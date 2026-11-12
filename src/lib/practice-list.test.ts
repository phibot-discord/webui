import assert from "node:assert/strict";
import test from "node:test";
import {
	PRACTICE_MAX,
	type PracticeItem,
	parsePracticeList,
	practiceItem,
	practiceReached,
	withoutPracticeItem,
	withPracticeItem,
} from "./practice-list";

const item = (id: string, at = 1): PracticeItem => ({
	id,
	rank: "IN",
	goal: "acc",
	value: 98,
	at,
});

const many = (n: number) =>
	Array.from({ length: n }, (_, i) => item(`S${i}.A.0`, i));

test("an accuracy goal keeps two decimals and its starting accuracy", () => {
	assert.deepEqual(
		practiceItem(
			{ id: "A.B.0", rank: "IN", goal: "acc", value: 98.994, from: 97.5 },
			5,
		),
		{ id: "A.B.0", rank: "IN", goal: "acc", value: 98.99, from: 97.5, at: 5 },
	);
});

test("a goal outside 70 to 100, an unknown level or an unknown goal is refused", () => {
	const base = { id: "A.B.0", rank: "IN", goal: "acc", value: 98 };
	assert.equal(practiceItem({ ...base, value: 69.99 }, 1), undefined);
	assert.equal(practiceItem({ ...base, value: 100.01 }, 1), undefined);
	assert.equal(practiceItem({ ...base, rank: "SP" }, 1), undefined);
	assert.equal(practiceItem({ ...base, goal: "score" }, 1), undefined);
});

test("full combo and AP goals carry no value", () => {
	assert.deepEqual(
		practiceItem({ id: "A.B.0", rank: "AT", goal: "fc", value: 99 }, 2),
		{ id: "A.B.0", rank: "AT", goal: "fc", at: 2 },
	);
	assert.deepEqual(
		practiceItem({ id: "A.B.0", rank: "AT", goal: "ap", value: 99 }, 2),
		{ id: "A.B.0", rank: "AT", goal: "ap", at: 2 },
	);
});

test("the time comes from the caller, not from the input", () => {
	const got = practiceItem({ id: "A.B.0", rank: "HD", goal: "ap", at: 1 }, 9);
	assert.equal(got?.at, 9);
});

test("a stored list survives bad entries and repeats", () => {
	const raw = JSON.stringify({
		v: 1,
		items: [
			{ id: "A.B.0", rank: "IN", goal: "acc", value: 99, at: 3 },
			{ id: "", rank: "XX", goal: "acc" },
			{ id: "A.B.0", rank: "IN", goal: "ap", at: 4 },
		],
	});
	assert.deepEqual(parsePracticeList(raw), [
		{ id: "A.B.0", rank: "IN", goal: "acc", value: 99, at: 3 },
	]);
	assert.deepEqual(parsePracticeList("not json"), []);
	assert.deepEqual(parsePracticeList(undefined), []);
});

test("a stored list keeps the time each chart was added", () => {
	const raw = JSON.stringify({
		v: 1,
		items: [
			{ id: "A.B.0", rank: "IN", goal: "ap", at: 1_700_000_000_000 },
			{ id: "C.D.0", rank: "AT", goal: "fc", at: 1_700_000_500_000 },
		],
	});
	assert.deepEqual(
		parsePracticeList(raw).map((x) => x.at),
		[1_700_000_000_000, 1_700_000_500_000],
	);
});

test("adding a chart that is already on the list replaces its goal", () => {
	const list = [item("A.0"), item("B.0"), item("C.0")];
	const next = withPracticeItem(list, {
		id: "A.0",
		rank: "IN",
		goal: "ap",
		at: 7,
	});
	assert.ok(Array.isArray(next));
	assert.equal(next.length, 3);
	assert.deepEqual(next.at(-1), { id: "A.0", rank: "IN", goal: "ap", at: 7 });
	assert.deepEqual(
		next.map((x) => x.id),
		["B.0", "C.0", "A.0"],
	);
});

test("the list refuses a 31st chart but still lets a listed chart change", () => {
	const full = many(PRACTICE_MAX);
	assert.equal(withPracticeItem(full, item("New.0", 99)), "full");
	const changed = withPracticeItem(full, {
		id: "S3.A.0",
		rank: "IN",
		goal: "fc",
		at: 99,
	});
	assert.ok(Array.isArray(changed));
	assert.equal(changed.length, PRACTICE_MAX);
});

test("removing a chart that is not on the list changes nothing", () => {
	const list = [item("A.0"), item("B.0")];
	assert.deepEqual(withoutPracticeItem(list, "C.0", "IN"), list);
	assert.deepEqual(withoutPracticeItem(list, "A.0", "AT"), list);
});

test("an accuracy goal is reached at or above its value", () => {
	const goal: PracticeItem = {
		id: "A.0",
		rank: "IN",
		goal: "acc",
		value: 98.99,
		at: 1,
	};
	assert.equal(
		practiceReached(goal, { acc: 98.99, score: 990000, fc: false }),
		true,
	);
	assert.equal(
		practiceReached(goal, { acc: 98.98, score: 989000, fc: false }),
		false,
	);
});

test("a full combo goal is reached by a full combo or an AP", () => {
	const goal: PracticeItem = { id: "A.0", rank: "IN", goal: "fc", at: 1 };
	assert.equal(
		practiceReached(goal, { acc: 97, score: 960000, fc: true }),
		true,
	);
	assert.equal(
		practiceReached(goal, { acc: 100, score: 1_000_000, fc: false }),
		true,
	);
	assert.equal(
		practiceReached(goal, { acc: 99, score: 990000, fc: false }),
		false,
	);
});

test("an AP goal needs a million points", () => {
	const goal: PracticeItem = { id: "A.0", rank: "AT", goal: "ap", at: 1 };
	assert.equal(
		practiceReached(goal, { acc: 99.99, score: 999_999, fc: true }),
		false,
	);
	assert.equal(
		practiceReached(goal, { acc: 100, score: 1_000_000, fc: true }),
		true,
	);
});

test("an unplayed chart has reached nothing", () => {
	for (const goal of ["acc", "fc", "ap"] as const)
		assert.equal(
			practiceReached(
				{ id: "A.0", rank: "IN", goal, value: 70, at: 1 },
				undefined,
			),
			false,
		);
});
