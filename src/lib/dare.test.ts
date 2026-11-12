import assert from "node:assert/strict";
import test from "node:test";
import {
	DARE_DAYS,
	type Dare,
	dareAcc,
	dareExpired,
	dareGap,
	dareUntil,
	decodeDare,
	encodeDare,
} from "./dare";

test("a dare survives a round trip", () => {
	const d: Dare = {
		rank: "IN",
		acc: 99.42,
		status: "fc",
		name: "Yue",
		until: 20800,
	};
	const payload = encodeDare(d);
	assert.equal(payload, "1.IN.9942.1.20800.WXVl");
	assert.deepEqual(decodeDare(payload), d);
});

test("accuracy is cut down, never rounded up", () => {
	const payload = encodeDare({
		rank: "AT",
		acc: 99.999,
		status: "none",
		name: "A",
		until: 20800,
	});
	assert.equal(payload.split(".")[2], "9999");
	assert.equal(dareAcc(99.42), 99.42);
	assert.equal(dareAcc(0.29), 0.29);
});

test("a name keeps its non-ASCII characters and is cut to 40", () => {
	const name = "谱面挑战者".repeat(12);
	assert.equal([...name].length, 60);
	const got = decodeDare(
		encodeDare({ rank: "HD", acc: 98.5, status: "ap", name, until: 20800 }),
	);
	assert.equal(got?.name, [...name].slice(0, 40).join(""));
	assert.equal(got?.status, "ap");
});

test("a payload with a wrong part is refused", () => {
	for (const payload of [
		"1.SP.9942.1.20800.WXVl",
		"1.IN.9942.3.20800.WXVl",
		"1.IN.10001.1.20800.WXVl",
		"1.IN.9942.1.20800",
		"2.IN.9942.1.20800.WXVl",
		"1.IN.9942.1.20800.WX+l",
		"1.IN.9942.1.WXVl",
		"1.IN.9942.1.soon.WXVl",
		"1.IN.9942.1.-1.WXVl",
	]) {
		assert.equal(decodeDare(payload), undefined, payload);
	}
});

test("the gap is the visitor's accuracy minus the dare's, in hundredths", () => {
	assert.equal(dareGap(99.42, 98.9), -0.52);
	assert.equal(dareGap(98, 98.31), 0.31);
	assert.equal(dareGap(99.42, 99.42), 0);
});

test("a dare ends 30 days after the day it was made", () => {
	const day = 86_400_000;
	const made = Date.UTC(2026, 10, 13, 15, 30);
	const until = dareUntil(made);
	assert.equal(DARE_DAYS, 30);
	assert.equal(until, Math.floor(made / day) + 30);
	assert.equal(dareExpired(until, made), false);
	assert.equal(dareExpired(until, Date.UTC(2026, 11, 13, 23, 59, 59)), false);
	assert.equal(dareExpired(until, Date.UTC(2026, 11, 14)), true);
});
