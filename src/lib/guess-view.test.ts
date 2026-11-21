import assert from "node:assert/strict";
import test from "node:test";
import { gameOf } from "./guess";
import { guessHref, guessView } from "./guess-view";

const TODAY = "2026-11-21";

test("no query is today's illustration daily", () => {
	assert.deepEqual(guessView({}, TODAY), {
		game: "jacket",
		puzzle: "d-2026-11-21",
		daily: true,
		day: TODAY,
		live: true,
	});
});

test("p picks a practice puzzle or a past daily, and anything else falls back to today", () => {
	assert.deepEqual(guessView({ p: "p-abcdefghijkl" }, TODAY), {
		game: "jacket",
		puzzle: "p-abcdefghijkl",
		daily: false,
		day: "",
		live: false,
	});
	assert.deepEqual(guessView({ p: "d-2026-11-02" }, TODAY), {
		game: "jacket",
		puzzle: "d-2026-11-02",
		daily: true,
		day: "2026-11-02",
		live: false,
	});
	for (const p of ["d-2026-11-22", "junk", "", " "]) {
		assert.equal(
			(guessView({ p }, TODAY) as { puzzle: string }).puzzle,
			"d-2026-11-21",
			p,
		);
	}
});

test("ear picks the game by ear: today's daily, a past daily or a practice song", () => {
	const today = {
		game: "ear",
		puzzle: "d-2026-11-21",
		daily: true,
		day: TODAY,
		live: true,
	};
	assert.deepEqual(guessView({ ear: "daily" }, TODAY), today);
	assert.deepEqual(guessView({ ear: "d-2026-11-21" }, TODAY), today);
	assert.deepEqual(guessView({ ear: "d-2026-11-22" }, TODAY), today);
	assert.deepEqual(guessView({ ear: "junk" }, TODAY), today);
	assert.deepEqual(
		guessView({ ear: ["daily", "p-abcdefghijkl"] }, TODAY),
		today,
	);
	assert.deepEqual(guessView({ ear: "d-2026-11-20" }, TODAY), {
		game: "ear",
		puzzle: "d-2026-11-20",
		daily: true,
		day: "2026-11-20",
		live: false,
	});
	assert.deepEqual(guessView({ ear: " p-abcdefghijkl " }, TODAY), {
		game: "ear",
		puzzle: "p-abcdefghijkl",
		daily: false,
		day: "",
		live: false,
	});
	assert.equal(
		(
			guessView({ ear: "daily", p: "p-abcdefghijkl" }, TODAY) as {
				game: string;
			}
		).game,
		"ear",
	);
});

test("new asks for a fresh practice puzzle, the illustration first", () => {
	assert.deepEqual(guessView({ p: "new" }, TODAY), { redirect: "p" });
	assert.deepEqual(guessView({ ear: "new" }, TODAY), { redirect: "ear" });
	assert.deepEqual(guessView({ p: "new", ear: "new" }, TODAY), {
		redirect: "p",
	});
	assert.deepEqual(guessView({ p: ["new", "x"] }, TODAY), { redirect: "p" });
});

test("the tabs reach all four modes", () => {
	assert.equal(guessHref("jacket", true), "/guess");
	assert.equal(guessHref("jacket", false), "/guess?p=new");
	assert.equal(guessHref("ear", true), "/guess?ear=daily");
	assert.equal(guessHref("ear", false), "/guess?ear=new");
});

test("only ear names the game by ear", () => {
	assert.equal(gameOf("ear"), "ear");
	for (const raw of [undefined, null, "", "jacket", "EAR", 1, ["ear"]]) {
		assert.equal(gameOf(raw), "jacket");
	}
});
