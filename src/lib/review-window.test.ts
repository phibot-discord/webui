import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import {
	countdownParts,
	REVIEW_OPENS_AT,
	REVIEW_PATH,
	recapYear,
	reviewLinked,
	reviewPath,
	reviewSecondsLeft,
	reviewWindow,
	reviewYear,
} from "./review-window";

const at = (iso: string) => Date.parse(iso);

test("the review opens at midnight on 1 December, China time", () => {
	assert.equal(reviewWindow(at("2026-11-30T15:59:59.999Z")), "soon");
	assert.equal(reviewWindow(at("2026-11-30T16:00:00.000Z")), "open");
});

test("the countdown reads zero exactly when the review opens, never before", () => {
	assert.equal(REVIEW_OPENS_AT, at("2026-11-30T16:00:00.000Z"));
	assert.equal(reviewSecondsLeft(at("2026-11-30T15:59:59.999Z")), 1);
	assert.equal(reviewSecondsLeft(at("2026-11-30T15:59:59.000Z")), 1);
	assert.equal(reviewSecondsLeft(at("2026-11-30T15:59:58.999Z")), 2);
	assert.equal(reviewSecondsLeft(at("2026-11-30T16:00:00.000Z")), 0);
	assert.equal(reviewSecondsLeft(at("2026-12-25T00:00:00Z")), 0);
	for (const iso of [
		"2026-11-12T08:30:00.250Z",
		"2026-11-30T15:59:59.001Z",
		"2026-11-30T15:59:59.999Z",
		"2026-11-30T16:00:00.000Z",
		"2026-11-30T16:00:00.001Z",
	])
		assert.equal(
			reviewSecondsLeft(at(iso)) === 0,
			reviewWindow(at(iso)) !== "soon",
			iso,
		);
});

test("the seconds left split into days, hours, minutes and seconds", () => {
	assert.deepEqual(countdownParts(0), {
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});
	assert.deepEqual(countdownParts(59), {
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 59,
	});
	assert.deepEqual(countdownParts(86400), {
		days: 1,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});
	assert.deepEqual(
		countdownParts(reviewSecondsLeft(at("2026-11-12T08:29:15.500Z"))),
		{ days: 18, hours: 7, minutes: 30, seconds: 45 },
	);
	assert.deepEqual(
		countdownParts(reviewSecondsLeft(at("2026-08-01T16:00:00Z"))),
		{ days: 121, hours: 0, minutes: 0, seconds: 0 },
	);
});

test("the year is complete from 1 January and linked until the end of 31 January", () => {
	assert.equal(reviewWindow(at("2026-12-31T15:59:59.999Z")), "open");
	assert.equal(reviewWindow(at("2026-12-31T16:00:00.000Z")), "complete");
	assert.equal(reviewWindow(at("2027-01-31T15:59:59.999Z")), "complete");
	assert.equal(reviewWindow(at("2027-01-31T16:00:00.000Z")), "unlinked");
	assert.deepEqual(
		(["soon", "open", "complete", "unlinked"] as const).map(reviewLinked),
		[false, true, true, false],
	);
});

test("before the window a dev server opens the review, a preview needs the switch, production never opens", () => {
	const before = at("2026-11-11T00:00:00Z");
	const early = { PHI_REVIEW_EARLY: "1" };
	assert.equal(reviewWindow(before, early), "soon");
	assert.equal(reviewWindow(before, { NODE_ENV: "development" }), "open");
	assert.equal(reviewWindow(before, { NODE_ENV: "production" }), "soon");
	assert.equal(reviewWindow(before, { VERCEL_ENV: "preview" }), "soon");
	assert.equal(
		reviewWindow(before, { NODE_ENV: "development", VERCEL_ENV: "production" }),
		"soon",
	);
	assert.equal(
		reviewWindow(before, { ...early, VERCEL_ENV: "preview" }),
		"open",
	);
	assert.equal(
		reviewWindow(before, { ...early, NODE_ENV: "development" }),
		"open",
	);
	for (const NODE_ENV of [undefined, "development", "production"]) {
		assert.equal(
			reviewWindow(before, { ...early, VERCEL_ENV: "production", NODE_ENV }),
			"soon",
		);
	}
	assert.equal(
		reviewWindow(before, { PHI_REVIEW_EARLY: "0", VERCEL_ENV: "preview" }),
		"soon",
	);
	assert.equal(
		reviewWindow(at("2027-02-10T00:00:00Z"), {
			...early,
			VERCEL_ENV: "preview",
		}),
		"unlinked",
	);
});

test("a requested year counts only from the first recap year to the review year", () => {
	assert.equal(reviewYear("2025"), 2026);
	assert.equal(reviewYear("2020"), 2026);
	assert.equal(reviewYear("2026"), 2026);
	assert.equal(reviewYear("2027"), 2026);
	assert.equal(reviewYear("2019"), 2026);
	assert.equal(reviewYear("abc"), 2026);
	assert.equal(reviewYear(null), 2026);
});

test("every year keeps its own recap address, read back from the path", () => {
	assert.equal(REVIEW_PATH, "/2026-recap");
	assert.equal(reviewPath(2025), "/2025-recap");
	assert.equal(recapYear("2026-recap"), 2026);
	for (const slug of [
		"2025-recap",
		"2020-recap",
		"2019-recap",
		"2027-recap",
		"recap",
		"2026-recap-x",
		"x2026-recap",
		"26-recap",
		"songs",
		"",
	])
		assert.equal(recapYear(slug), null, slug);
	assert.ok(existsSync("src/app/[locale]/[recap]/page.tsx"));
});
