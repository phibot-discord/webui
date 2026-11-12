import assert from "node:assert/strict";
import test from "node:test";
import { type Dare, dareUntil } from "@/lib/dare";
import { dareToken, readDare } from "./dare";

const SONG = "Glaciaxion.SunsetRay.0";
const NOW = Date.UTC(2026, 10, 13, 12);
const DAY = 86_400_000;
const DARE: Omit<Dare, "until"> = {
	rank: "IN",
	acc: 99.42,
	status: "fc",
	name: "Yue",
};

test("a token made for a song reads back on that song", () => {
	const token = dareToken(SONG, DARE, NOW);
	const until = dareUntil(NOW);
	assert.ok(token.startsWith(`1.IN.9942.1.${until}.WXVl.`));
	assert.deepEqual(readDare(SONG, token, NOW), { ...DARE, until });
});

test("a token is refused on another song", () => {
	const token = dareToken(SONG, DARE, NOW);
	assert.equal(readDare(SONG, token, NOW)?.name, "Yue");
	assert.equal(readDare("Rrhar'il.TeamGrimoire.0", token, NOW), undefined);
});

test("a token with an edited score is refused", () => {
	const token = dareToken(SONG, DARE, NOW);
	const edited = token.replace(".9942.", ".9999.");
	assert.notEqual(edited, token);
	assert.equal(readDare(SONG, edited, NOW), undefined);
});

test("a token with an edited signature, no signature, or too many characters is refused", () => {
	const token = dareToken(SONG, DARE, NOW);
	const last = token.at(-1);
	const flipped = `${token.slice(0, -1)}${last === "A" ? "B" : "A"}`;
	assert.equal(readDare(SONG, flipped, NOW), undefined);
	const payload = token.slice(0, token.lastIndexOf("."));
	assert.equal(readDare(SONG, payload, NOW), undefined);
	assert.equal(readDare(SONG, `${payload}.`, NOW), undefined);
	assert.equal(readDare(SONG, `${token}${"A".repeat(300)}`, NOW), undefined);
});

test("the longest name a link can carry still reads back", () => {
	const name = "\u{20000}".repeat(40);
	const long = dareToken(SONG, { ...DARE, name }, NOW);
	assert.ok(long.length > 200);
	assert.equal(readDare(SONG, long, NOW)?.name, name);
});

test("nothing is read from an empty or missing parameter", () => {
	assert.equal(readDare(SONG, undefined), undefined);
	assert.equal(readDare(SONG, ""), undefined);
	assert.equal(readDare(SONG, "."), undefined);
});

test("a link works for 30 days and not a day longer", () => {
	const token = dareToken(SONG, DARE, NOW);
	assert.equal(readDare(SONG, token, NOW + 30 * DAY)?.name, "Yue");
	assert.equal(readDare(SONG, token, NOW + 31 * DAY), undefined);
});

test("the end date cannot be moved without breaking the signature", () => {
	const token = dareToken(SONG, DARE, NOW);
	const until = dareUntil(NOW);
	const later = token.replace(`.${until}.`, `.${until + 365}.`);
	assert.notEqual(later, token);
	assert.equal(readDare(SONG, later, NOW), undefined);
});
