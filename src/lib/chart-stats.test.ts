import assert from "node:assert/strict";
import test from "node:test";
import { chartStats, diffStats, formatDuration } from "./chart-stats";

const line = (bpm: number, notes: [number, number, number?][]) => ({
	bpm,
	notesAbove: notes.map(([type, time, holdTime = 0]) => ({
		type,
		time,
		holdTime,
	})),
	notesBelow: [],
});

test("each line times its notes by its own BPM", () => {
	const stats = chartStats({
		formatVersion: 3,
		judgeLineList: [
			line(120, [
				[1, 32],
				[2, 96],
			]),
			line(240, [[4, 192]]),
		],
	});
	assert.ok(stats);
	assert.equal(stats.notes, 3);
	assert.deepEqual(stats.kinds, { tap: 1, drag: 1, hold: 0, flick: 1 });
	assert.deepEqual(stats.bpms, [120, 240]);
	assert.equal(stats.duration, 1.5);
	assert.deepEqual(stats.density, [1, 2]);
	assert.equal(stats.peak, 2);
});

test("holds extend the duration", () => {
	const stats = chartStats({
		judgeLineList: [line(60, [[3, 32, 64]])],
	});
	assert.equal(stats?.duration, 3);
	assert.equal(stats?.kinds.hold, 1);
	assert.equal(stats?.density.length, 3);
});

test("version 1 charts with numOfNotes parse the same way", () => {
	const stats = chartStats({
		formatVersion: 1,
		numOfNotes: 1,
		judgeLineList: [{ ...line(150, [[1, 32]]), numOfNotes: 1 }],
	});
	assert.equal(stats?.notes, 1);
});

test("junk is not a chart", () => {
	assert.equal(chartStats(null), undefined);
	assert.equal(chartStats({ judgeLineList: "x" }), undefined);
	assert.equal(chartStats({ judgeLineList: [line(0, [[1, 1]])] }), undefined);
});

test("a diff compares counts and per-second density", () => {
	const a = chartStats({
		judgeLineList: [
			line(60, [
				[1, 16],
				[1, 48],
			]),
		],
	});
	const b = chartStats({
		judgeLineList: [
			line(60, [
				[1, 16],
				[2, 48],
				[2, 80],
			]),
		],
	});
	assert.ok(a && b);
	const d = diffStats(a, b);
	assert.equal(d.notes, 1);
	assert.deepEqual(d.kinds, { tap: -1, drag: 2, hold: 0, flick: 0 });
	assert.deepEqual(d.density, [0, 0, 1]);
	assert.equal(d.changedSeconds, 1);
});

test("durations read as m:ss", () => {
	assert.equal(formatDuration(125.4), "2:05");
	assert.equal(formatDuration(0), "0:00");
});
