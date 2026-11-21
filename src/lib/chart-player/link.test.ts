import assert from "node:assert/strict";
import test from "node:test";
import {
	linkAddress,
	linkQuery,
	PREVIEW_ANCHOR,
	type PreviewLink,
	readLink,
} from "./link";
import { LOOP_MIN } from "./loop";

function roundTrip(link: PreviewLink): PreviewLink {
	return readLink(Object.fromEntries(new URLSearchParams(linkQuery(link))));
}

test("every parameter is read", () => {
	assert.deepEqual(readLink({ lv: "IN", t: "62", ver: "history:3.1.0" }), {
		rank: "IN",
		at: 62,
		version: "history:3.1.0",
	});
	assert.deepEqual(readLink({ lv: "AT", loop: "62-72.5" }), {
		rank: "AT",
		loop: [62, 72.5],
	});
	assert.deepEqual(readLink({}), {});
});

test("the level is any letter case and only one of the four levels", () => {
	assert.equal(readLink({ lv: "in" }).rank, "IN");
	assert.equal(readLink({ lv: "Hd" }).rank, "HD");
	assert.equal(readLink({ lv: "SP" }).rank, undefined);
	assert.equal(readLink({ lv: "LEGACY" }).rank, undefined);
	assert.equal(readLink({ lv: "" }).rank, undefined);
	assert.equal(readLink({ lv: "IN " }).rank, undefined);
});

test("a time is a whole number or a decimal of seconds, zero or more", () => {
	assert.equal(readLink({ t: "0" }).at, 0);
	assert.equal(readLink({ t: "62.5" }).at, 62.5);
	assert.equal(readLink({ t: "62.04" }).at, 62);
	assert.equal(readLink({ t: "007" }).at, 7);
});

test("a malformed or absurd time is ignored", () => {
	for (const t of [
		"-5",
		"+5",
		"1e3",
		"1:02",
		"62s",
		"abc",
		"",
		" 62",
		"62.",
		".5",
		"NaN",
		"Infinity",
		"99999999",
		"36000.1",
	]) {
		assert.equal(readLink({ t }).at, undefined, t);
	}
	assert.equal(readLink({ t: "36000" }).at, 36000);
});

test("a range is two times, ordered, at least the loop minimum long", () => {
	assert.deepEqual(readLink({ loop: "62-72" }).loop, [62, 72]);
	assert.deepEqual(readLink({ loop: "72-62" }).loop, [62, 72]);
	assert.deepEqual(readLink({ loop: "0-10.5" }).loop, [0, 10.5]);
	assert.deepEqual(readLink({ loop: "10-11" }).loop, [10, 11]);
	assert.equal(LOOP_MIN, 1);
	assert.equal(readLink({ loop: "10-10.9" }).loop, undefined);
	assert.equal(readLink({ loop: "10-10" }).loop, undefined);
});

test("a malformed range is ignored", () => {
	for (const loop of [
		"62",
		"62-",
		"-72",
		"-5-10",
		"a-b",
		"62-72-80",
		"62..5-72",
		"1:02-1:12",
		"10-99999999",
		"",
	]) {
		assert.equal(readLink({ loop }).loop, undefined, loop);
	}
});

test("a valid range wins over a time, a bad one does not", () => {
	assert.deepEqual(readLink({ loop: "62-72", t: "5" }), { loop: [62, 72] });
	assert.deepEqual(readLink({ loop: "62-62.5", t: "5" }), { at: 5 });
	assert.deepEqual(readLink({ loop: "x", t: "5" }), { at: 5 });
});

test("a version is kept as given unless empty or very long", () => {
	assert.equal(readLink({ ver: "removed" }).version, "removed");
	assert.equal(readLink({ ver: "" }).version, undefined);
	assert.equal(readLink({ ver: "x".repeat(81) }).version, undefined);
	assert.equal(readLink({ ver: "x".repeat(80) }).version, "x".repeat(80));
});

test("only the first of a repeated parameter counts", () => {
	assert.deepEqual(readLink({ lv: ["hd", "IN"], t: ["3", "9"] }), {
		rank: "HD",
		at: 3,
	});
	assert.deepEqual(readLink({ lv: [], t: undefined }), {});
});

test("the query is written in a fixed order with short numbers", () => {
	assert.equal(
		linkQuery({ version: "history:3.1.0", at: 62, rank: "in" }),
		"lv=IN&t=62&ver=history%3A3.1.0",
	);
	assert.equal(linkQuery({ rank: "AT", loop: [62, 72] }), "lv=AT&loop=62-72");
	assert.equal(linkQuery({ at: 62.5 }), "t=62.5");
	assert.equal(linkQuery({ at: 62.04 }), "t=62");
	assert.equal(linkQuery({ at: 62.26 }), "t=62.3");
	assert.equal(linkQuery({ rank: "IN" }), "lv=IN");
	assert.equal(linkQuery({}), "");
});

test("a time that is not worth a link is left out", () => {
	for (const at of [0, 0.04, -3, Number.NaN, Number.POSITIVE_INFINITY, 36001]) {
		assert.equal(linkQuery({ at }), "", String(at));
	}
	assert.equal(linkQuery({ at: 0.05 }), "t=0.1");
});

test("a level outside the four is left out", () => {
	assert.equal(linkQuery({ rank: "SP", at: 3 }), "t=3");
	assert.equal(linkQuery({ rank: "LEGACY" }), "");
});

test("a written range is never shorter than the range it came from", () => {
	assert.equal(linkQuery({ loop: [62.06, 63.04] }), "loop=62-63.1");
	assert.equal(linkQuery({ loop: [10.04, 11.04] }), "loop=10-11.1");
	assert.equal(linkQuery({ loop: [0.3, 1.5] }), "loop=0.3-1.5");
	assert.equal(linkQuery({ loop: [0.7, 2.1] }), "loop=0.7-2.1");
	assert.equal(linkQuery({ loop: [72, 62] }), "loop=62-72");
});

test("a range that cannot be read back falls back to the time", () => {
	assert.equal(linkQuery({ loop: [10, 10.5], at: 4 }), "t=4");
	assert.equal(linkQuery({ loop: [10, 10.5] }), "");
	assert.equal(linkQuery({ loop: [Number.NaN, 12], at: 4 }), "t=4");
	assert.equal(linkQuery({ loop: [-5, 30] }), "loop=0-30");
});

test("what is written is read back", () => {
	const links: PreviewLink[] = [
		{},
		{ rank: "EZ" },
		{ rank: "IN", at: 62 },
		{ rank: "AT", at: 62.5, version: "history:3.1.0" },
		{ rank: "HD", loop: [62, 72] },
		{ loop: [0.3, 1.5], version: "removed" },
		{ version: "fools" },
		{ at: 1234.5 },
	];
	for (const link of links) assert.deepEqual(roundTrip(link), link);
});

test("a written range always reads back as a loop", () => {
	for (const from of [0, 0.04, 0.05, 12.34, 59.96, 100.05]) {
		const link: PreviewLink = { loop: [from, from + LOOP_MIN] };
		const back = roundTrip(link);
		assert.ok(back.loop, String(from));
		assert.ok(back.loop[0] <= from && back.loop[1] >= from + LOOP_MIN);
	}
});

test("the address keeps the path and ends at the preview", () => {
	assert.equal(PREVIEW_ANCHOR, "song-preview");
	assert.equal(
		linkAddress("https://phibot.dev/songs/rrharil-teamgrimoire", {
			rank: "IN",
			at: 62,
		}),
		"https://phibot.dev/songs/rrharil-teamgrimoire?lv=IN&t=62#song-preview",
	);
	assert.equal(
		linkAddress("https://phibot.dev/zh/songs/x", {}),
		"https://phibot.dev/zh/songs/x#song-preview",
	);
});
