import assert from "node:assert/strict";
import test from "node:test";
import { compileChart, FLOOR_UNIT } from "./chart";
import {
	FrameBuilder,
	K_DRAG,
	K_FLICK,
	K_HOLD,
	K_LINE,
	K_RING,
	K_SPARK,
	K_TAP,
	NOTE_HW,
	STRIDE,
	TAP_HH,
} from "./frame";

const flat = (start: number, start2 = 0) => [
	{ startTime: 0, endTime: 1e9, start, end: start, start2, end2: start2 },
];

function line(extra: Record<string, unknown> = {}) {
	return {
		bpm: 120,
		judgeLineMoveEvents: flat(0.5, 0.5),
		judgeLineRotateEvents: flat(0),
		judgeLineDisappearEvents: flat(1),
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

function frame(lines: unknown[], t: number) {
	const chart = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: lines,
	});
	const fb = new FrameBuilder(chart);
	const n = fb.build(t);
	const rows = Array.from({ length: n }, (_, i) =>
		Array.from(fb.data.subarray(i * STRIDE, (i + 1) * STRIDE)),
	);
	return { rows, kinds: rows.map((r) => r[0]), fb };
}

test("lines, hold bodies, hold heads, drags, taps, flicks on top, then effects", () => {
	const { kinds } = frame(
		[
			line({
				notesAbove: [
					note(4, 40),
					note(1, 40),
					note(2, 40),
					note(3, 40, { holdTime: 16 }),
					note(1, 0),
				],
			}),
		],
		0.1,
	);
	assert.deepEqual(kinds, [
		K_LINE,
		K_HOLD,
		K_HOLD,
		K_DRAG,
		K_TAP,
		K_FLICK,
		K_RING,
		K_SPARK,
		K_SPARK,
		K_SPARK,
		K_SPARK,
	]);
});

test("a note sits floor distance above the line and leaves when hit", () => {
	const lines = [line({ notesAbove: [note(1, 64)] })];
	const before = frame(lines, 0.5).rows.find((r) => r[0] === K_TAP);
	assert.ok(before);
	assert.ok(Math.abs(before[2]! - 0.5 * FLOOR_UNIT) < 1e-6);
	assert.equal(frame(lines, 1).rows.filter((r) => r[0] === K_TAP).length, 0);
});

test("notes below the line flip their side", () => {
	const row = frame([line({ notesBelow: [note(1, 64)] })], 0.5).rows.find(
		(r) => r[0] === K_TAP,
	);
	assert.ok(row);
	assert.ok(row[2]! < 0);
	assert.ok(row[6]! < 0);
});

test("a future note behind the line stays hidden", () => {
	const lines = [
		line({
			speedEvents: [
				{ startTime: 0, endTime: 32, value: -1 },
				{ startTime: 32, endTime: 1e9, value: 4 },
			],
			notesAbove: [note(1, 64)],
		}),
	];
	assert.equal(frame(lines, 0.4).rows.filter((r) => r[0] === K_TAP).length, 0);
	assert.equal(frame(lines, 0.9).rows.filter((r) => r[0] === K_TAP).length, 1);
});

test("a hold drops its head once started and vanishes at its end", () => {
	const lines = [line({ notesAbove: [note(3, 64, { holdTime: 64 })] })];
	const early = frame(lines, 0.5).rows.filter((r) => r[0] === K_HOLD);
	const mid = frame(lines, 1.5).rows.filter((r) => r[0] === K_HOLD);
	assert.deepEqual(
		early.map((r) => r[9]),
		[0, 1],
	);
	assert.ok(Math.abs(early[0]![11]! - 1 * FLOOR_UNIT) < 1e-6);
	assert.ok(Math.abs(early[1]![2]! - 0.5 * FLOOR_UNIT) < 1e-6);
	assert.deepEqual(
		mid.map((r) => r[9]),
		[0],
	);
	assert.ok(Math.abs(mid[0]![11]! - 0.5 * FLOOR_UNIT) < 1e-6);
	assert.equal(frame(lines, 2).rows.filter((r) => r[0] === K_HOLD).length, 0);
});

test("a line with negative alpha hides its notes and itself", () => {
	const { kinds } = frame(
		[line({ judgeLineDisappearEvents: flat(-1), notesAbove: [note(1, 64)] })],
		0.5,
	);
	assert.deepEqual(kinds, []);
});

test("an invisible line still carries its notes", () => {
	const { kinds } = frame(
		[line({ judgeLineDisappearEvents: flat(0), notesAbove: [note(1, 64)] })],
		0.5,
	);
	assert.deepEqual(kinds, [K_TAP]);
});

test("effects fade over half a second and seeking back replays them", () => {
	const lines = [line({ notesAbove: [note(1, 64)] })];
	assert.equal(frame(lines, 1.2).fb.stats.fx, 1);
	assert.equal(frame(lines, 1.6).fb.stats.fx, 0);
	assert.equal(frame(lines, 0.9).fb.stats.fx, 0);
});

test("chord notes are drawn the same width as single notes", () => {
	const { rows } = frame(
		[line({ notesAbove: [note(1, 64), note(1, 64, { positionX: 2 })] })],
		0.5,
	);
	const taps = rows.filter((r) => r[0] === K_TAP);
	assert.equal(taps.length, 2);
	assert.ok(taps.every((r) => Math.abs(r[5]! - NOTE_HW) < 1e-6));
	assert.ok(taps.every((r) => r[8] === 1));
});

test("note size scales note bodies and hold heads, not hold lengths", () => {
	const lines = [
		line({ notesAbove: [note(1, 64), note(3, 96, { holdTime: 32 })] }),
	];
	const chart = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: lines,
	});
	const fb = new FrameBuilder(chart);
	fb.noteScale = 1.5;
	const n = fb.build(0.5);
	const rows = Array.from({ length: n }, (_, i) =>
		Array.from(fb.data.subarray(i * STRIDE, (i + 1) * STRIDE)),
	);
	const tap = rows.find((r) => r[0] === K_TAP);
	const body = rows.find((r) => r[0] === K_HOLD && r[9] === 0);
	const head = rows.find((r) => r[0] === K_HOLD && r[9] === 1);
	assert.ok(tap && body && head);
	assert.ok(Math.abs(tap[5]! - NOTE_HW * 1.5) < 1e-6);
	assert.ok(Math.abs(tap[6]! - TAP_HH * 1.5) < 1e-6);
	assert.ok(Math.abs(body[5]! - NOTE_HW * 1.5) < 1e-6);
	assert.ok(Math.abs(body[11]! - 0.5 * FLOOR_UNIT) < 1e-6);
	assert.ok(Math.abs(head[6]! - TAP_HH * 1.5) < 1e-6);
	const plain = frame(lines, 0.5).rows.find(
		(r) => r[0] === K_HOLD && r[9] === 0,
	);
	assert.ok(plain);
	assert.ok(Math.abs(body[6]! - plain[6]!) < 1e-9);
});

test("notes past the screen edge are not drawn", () => {
	const far = Array.from({ length: 50 }, (_, i) => note(1, 640 + i * 32));
	const lines = [line({ notesAbove: [note(1, 64), ...far] })];
	const { rows, fb } = frame(lines, 0.5);
	assert.equal(rows.filter((r) => r[0] === K_TAP).length, 1);
	assert.equal(fb.stats.notes, 1);
});

test("a slow note far ahead still shows", () => {
	const { rows } = frame(
		[line({ notesAbove: [note(1, 64), note(1, 6400, { speed: 0.005 })] })],
		0.5,
	);
	const taps = rows.filter((r) => r[0] === K_TAP);
	assert.equal(taps.length, 2);
	assert.ok(
		taps.some((r) => Math.abs(r[2]! - 99.5 * 0.005 * FLOOR_UNIT) < 1e-5),
	);
});

test("a line that runs backwards is walked past notes beyond the screen", () => {
	const { rows } = frame(
		[
			line({
				speedEvents: [
					{ startTime: 0, endTime: 32, value: 10 },
					{ startTime: 32, endTime: 64, value: -9 },
					{ startTime: 64, endTime: 1e9, value: 1 },
				],
				notesAbove: [note(1, 32), note(1, 64)],
			}),
		],
		0,
	);
	const taps = rows.filter((r) => r[0] === K_TAP);
	assert.equal(taps.length, 1);
	assert.ok(Math.abs(taps[0]![2]! - 0.5 * FLOOR_UNIT) < 1e-6);
});
