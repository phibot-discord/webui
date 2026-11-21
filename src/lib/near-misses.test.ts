import assert from "node:assert/strict";
import test from "node:test";
import { accuracyOf, exactScore } from "@/phi/lib/score-control";
import {
	AP_GOODS_MAX,
	BREAK_GOODS_LIMIT,
	breakReading,
	goodsFromAp,
	NEAR_LIST_MAX,
	type NearRecord,
	nearMisses,
} from "./near-misses";

const SIZES = [100, 333, 777, 1234, 2500, 5000];

function play(
	perfect: number,
	good: number,
	combo: number,
	notes: number,
	round = Math.round,
) {
	return {
		score: round(exactScore(perfect, good, combo, notes)),
		acc: Math.fround(accuracyOf(perfect, good, notes)),
	};
}

function fcPlay(goods: number, notes: number, round = Math.round) {
	return play(notes - goods, goods, notes, notes, round);
}

function breakPlay(goods: number, combo: number, notes: number) {
	return play(notes - 1 - goods, goods, combo, notes);
}

function record(
	id: string,
	c: number,
	notes: number | null,
	made: { score: number; acc: number },
	fc: boolean,
): NearRecord {
	return { id, rank: "IN", c, notes, fc, ...made };
}

test("a full combo with a few Goods is read back as that many Goods", () => {
	for (const notes of SIZES) {
		for (let goods = 1; goods <= Math.min(40, notes); goods++) {
			for (const round of [Math.round, Math.floor, Math.ceil]) {
				const { score, acc } = fcPlay(goods, notes, round);
				assert.equal(
					goodsFromAp(notes, score, acc),
					goods,
					`${notes} notes, ${goods} Goods`,
				);
			}
		}
	}
});

test("an All Perfect, no score and a score of zero are not near misses", () => {
	for (const notes of SIZES) {
		const ap = fcPlay(0, notes);
		assert.equal(ap.score, 1_000_000);
		assert.equal(goodsFromAp(notes, ap.score, ap.acc), undefined);
		assert.equal(goodsFromAp(notes, 0, 0), undefined);
	}
});

test("a best score that comes from a play without a full combo does not read as a full combo", () => {
	for (const notes of SIZES) {
		const made = play(notes - 3, 0, Math.ceil(notes / 2), notes);
		assert.equal(
			goodsFromAp(notes, made.score, made.acc),
			undefined,
			String(notes),
		);
	}
});

test("a stored accuracy below the accuracy of the reading drops the chart", () => {
	const notes = 1000;
	const { score, acc } = fcPlay(3, notes);
	assert.equal(goodsFromAp(notes, score, acc), 3);
	assert.equal(goodsFromAp(notes, score, acc - 0.5), undefined);
	assert.equal(goodsFromAp(notes, score, acc + 0.2), 3);
});

test("a note count outside 1 to 5000 or missing is skipped", () => {
	const made = fcPlay(2, 1000);
	assert.equal(goodsFromAp(0, made.score, made.acc), undefined);
	assert.equal(goodsFromAp(5001, made.score, made.acc), undefined);
	assert.equal(goodsFromAp(1000.5, made.score, made.acc), undefined);
	const list = nearMisses([
		record("a.0", 15, null, made, true),
		record("b.0", 15, 0, made, true),
		record("c.0", 15, 5001, made, true),
		record("d.0", 15, 1000, { score: 0, acc: 0 }, true),
	]);
	assert.deepEqual(list, { ap: [], breaks: [] });
});

test("one Bad or Miss with a few Goods is read back with its longest combo", () => {
	for (const notes of [100, 777, 1234, 3000]) {
		for (let goods = 0; goods < BREAK_GOODS_LIMIT; goods++) {
			const hit = notes - 1;
			const low = Math.ceil(hit / 2);
			for (const combo of [low, Math.floor((low + hit) / 2), hit]) {
				const { score, acc } = breakPlay(goods, combo, notes);
				assert.deepEqual(
					breakReading(notes, score, acc),
					{ goods, combo },
					`${notes} notes, ${goods} Goods, combo ${combo}`,
				);
			}
		}
	}
});

test("a break read needs the exact accuracy of one break", () => {
	const notes = 1000;
	const { score, acc } = breakPlay(4, 600, notes);
	assert.deepEqual(breakReading(notes, score, acc), { goods: 4, combo: 600 });
	assert.equal(breakReading(notes, score, acc + 0.02), undefined);
	assert.equal(breakReading(notes, score, acc - 0.02), undefined);
});

test("25 Goods with one break is left out, since 8 breaks give the same accuracy", () => {
	for (const notes of [500, 1234, 3000]) {
		const { score, acc } = breakPlay(25, Math.ceil((notes - 1) / 2), notes);
		assert.equal(breakReading(notes, score, acc), undefined, String(notes));
		const edge = breakPlay(
			BREAK_GOODS_LIMIT,
			Math.ceil((notes - 1) / 2),
			notes,
		);
		assert.equal(breakReading(notes, edge.score, edge.acc), undefined);
	}
});

test("two breaks are not read as one", () => {
	for (const notes of [200, 1234, 3000]) {
		for (let goods = 0; goods < 12; goods++) {
			const { score, acc } = play(
				notes - 2 - goods,
				goods,
				Math.ceil((notes - 2) / 3),
				notes,
			);
			assert.equal(breakReading(notes, score, acc), undefined);
		}
	}
});

test("a best score and a best accuracy from different plays are left out", () => {
	const notes = 1000;
	const scoreOf = breakPlay(2, 700, notes).score;
	const otherAcc = play(notes - 3, 0, 400, notes).acc;
	assert.equal(breakReading(notes, scoreOf, otherAcc), undefined);
	const sameAcc = breakPlay(2, 700, notes).acc;
	const otherScore = breakPlay(2, 700, notes).score + 30_000 / notes;
	assert.equal(breakReading(notes, otherScore, sameAcc), undefined);
	assert.equal(breakReading(notes, 0, sameAcc), undefined);
	assert.equal(breakReading(0, scoreOf, sameAcc), undefined);
});

test("both lists come out sorted by Goods, then by constant, and are cut", () => {
	const notes = 800;
	const records: NearRecord[] = [];
	for (let i = 0; i < 30; i++) {
		records.push(
			record(
				`ap${i}.0`,
				10 + (i % 7),
				notes,
				fcPlay(1 + (i % 12), notes),
				true,
			),
		);
		records.push(
			record(
				`br${i}.0`,
				10 + (i % 7),
				notes,
				breakPlay(i % 15, 500 + i, notes),
				false,
			),
		);
	}
	const { ap, breaks } = nearMisses(records);
	assert.equal(ap.length, NEAR_LIST_MAX);
	assert.equal(breaks.length, NEAR_LIST_MAX);
	for (const row of ap) assert.ok(row.goods >= 1 && row.goods <= AP_GOODS_MAX);
	for (const list of [ap, breaks]) {
		for (let i = 1; i < list.length; i++) {
			const a = list[i - 1];
			const b = list[i];
			assert.ok(a && b);
			assert.ok(a.goods < b.goods || (a.goods === b.goods && a.c >= b.c));
		}
	}
	assert.equal(ap[0]?.goods, 1);
	assert.ok(breaks.every((row) => row.notes === notes));
});

test("a flagged full combo is only read as a full combo, an unflagged chart only as a break", () => {
	const notes = 1000;
	const fc = fcPlay(2, notes);
	const brk = breakPlay(2, 700, notes);
	const found = nearMisses([
		record("a.0", 15, notes, fc, true),
		record("b.0", 14, notes, fc, false),
		record("c.0", 13, notes, brk, true),
		record("d.0", 12, notes, brk, false),
		record("e.0", 11, notes, fcPlay(12, notes), true),
	]);
	assert.deepEqual(
		found.ap.map((r) => [r.id, r.goods]),
		[["a.0", 2]],
	);
	assert.deepEqual(
		found.breaks.map((r) => [r.id, r.goods, r.combo, r.notes]),
		[["d.0", 2, 700, notes]],
	);
});
