import assert from "node:assert/strict";
import test from "node:test";
import { compileChart } from "./chart";
import {
	densityOf,
	hardestWindow,
	NOISE_BONUS,
	noiseSpans,
	noteWeights,
} from "./density";

const note = (type: number, time: number, speed = 1) => ({
	type,
	time,
	positionX: 0,
	holdTime: type === 3 ? 16 : 0,
	speed,
	floorPosition: 0,
});

test("notes land in bins on the audio clock, weighted when asked", () => {
	const d = densityOf([0, 1, 1.5, 9.9], 0.5, 10, 10);
	assert.deepEqual([...d.bins], [1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
	assert.equal(d.peak, 1);
	const w = densityOf([0, 1], 0, 10, 2, [2, 0.5]);
	assert.deepEqual([...w.bins], [2.5, 0]);
	assert.deepEqual([...densityOf([1], 0, 0, 4).bins], [0, 0, 0, 0]);
});

test("weights favour taps over drags, chords and fast notes", () => {
	const chart = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			{
				bpm: 120,
				speedEvents: [{ startTime: 0, endTime: 1e6, value: 1 }],
				notesAbove: [
					note(1, 0),
					note(1, 0),
					note(2, 64),
					note(1, 128),
					note(1, 192, 4),
				],
				notesBelow: [],
			},
		],
	});
	const w = noteWeights(chart);
	const at = (t: number) => [...chart.notes.time].indexOf(t);
	const r = 1.875 / 120;
	const single = w[at(128 * r)]!;
	assert.ok(w[at(0)]! > single, "a chord note outweighs a single tap");
	assert.ok(w[at(64 * r)]! < single, "a drag weighs less than a tap");
	assert.ok(w[at(192 * r)]! > single, "a fast note outweighs a normal one");
	assert.deepEqual(noiseSpans(chart), []);
});

test("the hardest window weighs notes and adds the noise-field bonus", () => {
	const times = [0, 1, 2, 30, 31, 32];
	const weights = [1, 1, 1, 1, 1, 1];
	const plain = hardestWindow(times, weights, [], 2, 10);
	assert.equal(plain?.count, 3);
	assert.equal(plain?.start, 2);
	const noisy = hardestWindow(times, weights, [[29, 45]], 2, 10);
	assert.equal(noisy?.start, 32);
	assert.equal(noisy?.noise, true);
	assert.ok(Math.abs((noisy?.score ?? 0) - 3 * (1 + NOISE_BONUS)) < 1e-9);
	const heavy = hardestWindow(times, [1, 1, 1, 2, 2, 2], [], 0, 10);
	assert.equal(heavy?.start, 30);
	assert.equal(hardestWindow([], [], [], 0, 10), null);
});
