import assert from "node:assert/strict";
import test from "node:test";
import {
	ASPECT,
	BELOW,
	compileChart,
	DRAG,
	FLICK,
	floorAt,
	HOLD,
	MULTI,
	NOTE_X,
	SOUND_DRAG,
	SOUND_TAP,
	segValue,
	TAP,
} from "./chart";

type Ev = {
	startTime: number;
	endTime: number;
	start: number;
	end: number;
	start2?: number;
	end2?: number;
};

const still = (start: number, start2 = 0): Ev[] => [
	{ startTime: -999999, endTime: 1e9, start, end: start, start2, end2: start2 },
];

function line(extra: Record<string, unknown> = {}) {
	return {
		bpm: 120,
		judgeLineMoveEvents: still(0.5, 0.5),
		judgeLineRotateEvents: still(0),
		judgeLineDisappearEvents: still(1),
		speedEvents: [{ startTime: 0, endTime: 1e9, value: 1 }],
		notesAbove: [],
		notesBelow: [],
		...extra,
	};
}

const note = (
	type: number,
	time: number,
	extra: Record<string, unknown> = {},
) => ({
	type,
	time,
	positionX: 0,
	holdTime: 0,
	speed: 1,
	floorPosition: 0,
	...extra,
});

test("times are 1/32 beats of each line's bpm", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0.25,
		judgeLineList: [
			line({ notesAbove: [note(1, 64)] }),
			line({ bpm: 60, notesAbove: [note(1, 64)] }),
		],
	});
	assert.equal(c.offset, 0.25);
	assert.deepEqual([...c.notes.time], [1, 2]);
	assert.equal(c.notes.kind[0], TAP);
});

test("format 3 moves map 0..1 to the screen, y scaled by the aspect", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			line({
				judgeLineMoveEvents: [
					{ startTime: 0, endTime: 64, start: 0, end: 1, start2: 0, end2: 1 },
					{ startTime: 64, endTime: 1e9, start: 1, end: 1, start2: 1, end2: 1 },
				],
			}),
		],
	});
	assert.equal(segValue(c.move, 0, 0, 9), -1);
	assert.ok(Math.abs(segValue(c.move, 0, 0.5, 9)) < 1e-9);
	assert.equal(segValue(c.move, 0, 1, 9), 1);
	assert.ok(Math.abs(segValue(c.move, 0, 1, 9, true) - 1 / ASPECT) < 1e-6);
});

test("format 1 packs x*1000+y on an 880x520 grid", () => {
	const c = compileChart({
		formatVersion: 1,
		offset: 0,
		judgeLineList: [
			line({
				judgeLineMoveEvents: [
					{ startTime: 0, endTime: 1e9, start: 440260, end: 440260 },
				],
			}),
			line({
				judgeLineMoveEvents: [
					{ startTime: 0, endTime: 1e9, start: 880520, end: 880520 },
				],
			}),
		],
	});
	assert.equal(c.format, 1);
	assert.ok(Math.abs(segValue(c.move, 0, 1, 9)) < 1e-9);
	assert.ok(Math.abs(segValue(c.move, 0, 1, 9, true)) < 1e-9);
	assert.equal(segValue(c.move, 1, 1, 9), 1);
	assert.ok(Math.abs(segValue(c.move, 1, 1, 9, true) - 1 / ASPECT) < 1e-6);
});

test("events are sorted, reversed ones dropped, negative starts clamped", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			line({
				judgeLineDisappearEvents: [
					{ startTime: 64, endTime: 1e9, start: 0.5, end: 0.5 },
					{ startTime: 80, endTime: 70, start: 9, end: 9 },
					{ startTime: -100, endTime: 64, start: 0, end: 0 },
				],
			}),
		],
	});
	assert.equal(c.alpha.off[1], 2);
	assert.equal(c.alpha.t0[0], 0);
	assert.equal(segValue(c.alpha, 0, 0.5, 1), 0);
	assert.equal(segValue(c.alpha, 0, 2, 1), 0.5);
	assert.equal(
		segValue(
			compileChart({
				formatVersion: 3,
				offset: 0,
				judgeLineList: [line({ judgeLineDisappearEvents: [] })],
			}).alpha,
			0,
			1,
			1,
		),
		1,
	);
});

test("floor integrates speed from 0, the first event forced to start at 0", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			line({
				speedEvents: [
					{ startTime: 32, endTime: 64, value: 2 },
					{ startTime: 64, endTime: 1e9, value: 1 },
				],
				notesAbove: [note(1, 96)],
			}),
		],
	});
	assert.equal(floorAt(c.speed, 0, 0.5), 1);
	assert.equal(floorAt(c.speed, 0, 1.5), 2.5);
	assert.equal(c.notes.floor[0], 2.5);
});

test("holds move at speed 1 and run holdTime*speed past their floor", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			line({
				speedEvents: [{ startTime: 0, endTime: 1e9, value: 1.5 }],
				notesAbove: [
					note(3, 64, { holdTime: 32, speed: 1.5 }),
					note(2, 64, { speed: 2 }),
				],
			}),
		],
	});
	const hold = c.notes.kind[0] === HOLD ? 0 : 1;
	const drag = 1 - hold;
	assert.equal(c.notes.speed[hold], 1);
	assert.equal(c.notes.end[hold], 1.5);
	assert.equal(c.notes.floor[hold], 1.5);
	assert.equal(c.notes.tail[hold], 1.5 + 0.5 * 1.5);
	assert.equal(c.notes.speed[drag], 2);
	assert.equal(c.notes.kind[drag], DRAG);
	assert.equal(c.notes.maxHold, 0.5);
});

test("notes below the line are flagged and x is scaled", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [line({ notesBelow: [note(4, 64, { positionX: 2 })] })],
	});
	assert.equal(c.notes.flags[0]! & BELOW, BELOW);
	assert.equal(c.notes.kind[0], FLICK);
	assert.ok(Math.abs(c.notes.x[0]! - 2 * NOTE_X) < 1e-6);
});

test("notes sharing a time on any line are highlighted", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			line({ notesAbove: [note(1, 64), note(1, 96)] }),
			line({ bpm: 60, notesAbove: [note(2, 32)] }),
		],
	});
	const flags = [...c.notes.time].map(
		(t, i) => [t, c.notes.flags[i]! & MULTI] as const,
	);
	assert.deepEqual(flags, [
		[1, MULTI],
		[1, MULTI],
		[1.5, 0],
	]);
	assert.equal(c.hits.t.length, 3);
	assert.deepEqual([...c.hits.sound], [SOUND_TAP, SOUND_DRAG, SOUND_TAP]);
});

test("unknown note types are skipped and notes are sorted by time", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			line({ notesAbove: [note(1, 96), note(9, 10), note(1, 64)] }),
		],
	});
	assert.deepEqual([...c.notes.time], [1, 1.5]);
	assert.equal(c.counts.tap, 2);
});

test("hit effects: one per note, holds every 0.15 s and at the end", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			line({
				judgeLineRotateEvents: still(90),
				notesAbove: [
					note(1, 0, { positionX: 1 }),
					note(3, 64, { holdTime: 25.6 }),
				],
			}),
		],
	});
	assert.deepEqual(
		[...c.fx.t].map((t) => Number(t.toFixed(3))),
		[0, 1, 1.15, 1.3, 1.4],
	);
	assert.ok(Math.abs(c.fx.x[0]!) < 1e-6);
	assert.ok(Math.abs(c.fx.y[0]! - NOTE_X) < 1e-6);
	assert.equal(c.fx.peak, 4);
});

test("rejects input without judge lines", () => {
	assert.throws(() => compileChart({ formatVersion: 3, judgeLineList: [] }));
	assert.throws(() => compileChart(null));
});
