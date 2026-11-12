import assert from "node:assert/strict";
import test from "node:test";
import {
	MOTION_START,
	type MotionSample,
	type MotionState,
	motionStep,
} from "./deck-motion";

function feed(samples: MotionSample[], from: MotionState = MOTION_START) {
	let state = from;
	const flicks: number[] = [];
	for (const sample of samples) {
		const out = motionStep(state, sample);
		state = out.state;
		flicks.push(out.flick);
	}
	return { state, flicks };
}

const pose = (
	t: number,
	gamma: number,
	beta: number,
	alpha = 0,
): MotionSample => ({ t, alpha, beta, gamma });

const still = (n: number, gamma: number, beta: number, start = 0) =>
	Array.from({ length: n }, (_, i) => pose(start + i * 16, gamma, beta));

test("the first reading only sets the resting pose", () => {
	const { state, flicks } = feed([pose(0, 12, 50)]);
	assert.deepEqual(flicks, [0]);
	assert.equal(state.x, 0);
	assert.equal(state.y, 0);
	assert.equal(state.t, 0);
	assert.ok(state.frame);
});

test("a slow tilt moves the card that way and never flicks", () => {
	const rest = feed(still(5, 0, 50)).state;
	const tilt = Array.from({ length: 40 }, (_, i) =>
		pose(80 + i * 16, Math.min(20, i), 50),
	);
	const { state, flicks } = feed(tilt, rest);
	assert.ok(state.x > 0.3, String(state.x));
	assert.ok(Math.abs(state.y) < 0.05);
	assert.ok(flicks.every((f) => f === 0));
	const left = feed(
		tilt.map((s) => ({ ...s, gamma: -s.gamma })),
		rest,
	).state;
	assert.ok(left.x < -0.3);
});

test("raising the top edge slides the card down, lowering it slides the card up", () => {
	const rest = feed(still(5, 0, 40)).state;
	const raise = Array.from({ length: 30 }, (_, i) =>
		pose(80 + i * 16, 0, 40 + Math.min(18, i)),
	);
	const up = feed(raise, rest).state;
	assert.ok(up.y > 0.3, String(up.y));
	assert.ok(Math.abs(up.x) < 0.05);
	const down = feed(
		raise.map((s) => ({ ...s, beta: 80 - s.beta })),
		rest,
	).state;
	assert.ok(down.y < -0.3, String(down.y));
});

test("the card never leaves its range however far the phone leans", () => {
	const rest = feed(still(3, 0, 40)).state;
	const lean = Array.from({ length: 200 }, (_, i) =>
		pose(48 + i * 16, Math.min(80, i * 0.4), Math.min(120, 40 + i * 0.4)),
	);
	const { state } = feed(lean, rest);
	assert.ok(state.x <= 1 && state.x >= -1);
	assert.ok(state.y <= 1 && state.y >= -1);
});

test("holding a new pose brings the card back to the middle", () => {
	const rest = feed(still(3, 0, 50)).state;
	const moved = feed(
		Array.from({ length: 20 }, (_, i) =>
			pose(48 + i * 16, Math.min(18, i * 1.5), 50),
		),
		rest,
	).state;
	assert.ok(moved.x > 0.3);
	const held = feed(still(400, 18, 50, 400), moved).state;
	assert.ok(Math.abs(held.x) < 0.05, String(held.x));
});

test("a quick turn of the wrist flicks once in its direction, then stays quiet for a moment", () => {
	const rest = feed(still(5, 0, 50)).state;
	const snap = [
		pose(96, 8, 50),
		pose(112, 18, 50),
		pose(128, 28, 50),
		pose(144, 36, 50),
		pose(160, 42, 50),
	];
	const right = feed(snap, rest);
	assert.equal(right.flicks.filter((f) => f === 1).length, 1);
	assert.ok(right.flicks.every((f) => f >= 0));
	const left = feed(
		snap.map((s) => ({ ...s, gamma: -s.gamma })),
		rest,
	);
	assert.equal(left.flicks.filter((f) => f === -1).length, 1);
	const again = feed(
		[pose(400, 10, 50), pose(416, -12, 50), pose(432, -34, 50)],
		right.state,
	);
	assert.ok(again.flicks.every((f) => f === 0));
	const later = feed(
		[
			pose(1200, -34, 50),
			pose(1216, -20, 50),
			pose(1232, -4, 50),
			pose(1248, 12, 50),
		],
		again.state,
	);
	assert.equal(later.flicks.filter((f) => f === 1).length, 1);
});

test("the same wrist turn reads the same lying flat and standing upright", () => {
	const sweep = (at: (i: number, t: number) => MotionSample) =>
		feed(Array.from({ length: 12 }, (_, i) => at(i, i * 16)));
	const flat = sweep((i, t) => pose(t, i * 5, 0));
	const upright = sweep((i, t) => pose(t, 0, 90, i * 5));
	assert.ok(flat.state.rate > 250, String(flat.state.rate));
	assert.ok(
		Math.abs(flat.state.rate - upright.state.rate) < 1e-6,
		`${flat.state.rate} ${upright.state.rate}`,
	);
	assert.ok(Math.abs(flat.state.x - upright.state.x) < 1e-9);
	assert.deepEqual(flat.flicks, upright.flicks);
	assert.equal(flat.flicks.filter((f) => f === 1).length, 1);
});

test("the way the phone faces does not change the reading", () => {
	const turnAt = (alpha: number) =>
		feed(
			Array.from({ length: 30 }, (_, i) =>
				pose(i * 16, 10 + Math.min(20, i * 2), 40 + Math.min(12, i), alpha),
			),
		).state;
	const north = turnAt(0);
	assert.ok(north.x > 0.3 && north.y > 0.2, `${north.x} ${north.y}`);
	for (const alpha of [70, 123, 310]) {
		const other = turnAt(alpha);
		assert.ok(Math.abs(other.x - north.x) < 1e-9, `${alpha} ${other.x}`);
		assert.ok(Math.abs(other.y - north.y) < 1e-9, `${alpha} ${other.y}`);
		assert.ok(Math.abs(other.rate - north.rate) < 1e-6, `${alpha}`);
	}
});

test("one pose written two ways is not a move", () => {
	const rest = feed(
		Array.from({ length: 5 }, (_, i) => pose(i * 16, 89, 40, 10)),
	).state;
	const { state, flicks } = feed([pose(80, -89, 140, 190)], rest);
	assert.deepEqual(flicks, [0]);
	assert.ok(Math.abs(state.rate) < 130, String(state.rate));
	assert.ok(Math.abs(state.x) < 0.05, String(state.x));
	const exact = feed([pose(80, -91, 140, 190)], rest).state;
	assert.ok(Math.abs(exact.rate) < 1e-6, String(exact.rate));
});

test("sensor noise near upright, where two angles trade off, is not a move", () => {
	const noisy = Array.from({ length: 60 }, (_, i) => {
		const wobble = i % 2 === 0 ? 25 : -25;
		return pose(i * 16, -wobble, 90, 200 + wobble);
	});
	const { state, flicks } = feed(noisy);
	assert.ok(flicks.every((f) => f === 0));
	assert.ok(Math.abs(state.rate) < 1e-6, String(state.rate));
	assert.ok(Math.abs(state.x) < 1e-6);
});

test("a repeated time, a missing reading, a long pause and a jump are not moves", () => {
	const rest = feed(still(5, 0, 50)).state;
	const same = motionStep(rest, pose(rest.t ?? 0, 40, 50));
	assert.equal(same.flick, 0);
	assert.equal(same.state, rest);
	const blank = motionStep(rest, pose(200, Number.NaN, 50));
	assert.equal(blank.flick, 0);
	assert.equal(blank.state, rest);
	const pause = motionStep(rest, pose(5000, 40, 50));
	assert.equal(pause.flick, 0);
	assert.equal(pause.state.rate, 0);
	assert.ok(Math.abs(pause.state.x) < 1e-9);
	const jump = motionStep(rest, pose(80, 85, 50));
	assert.equal(jump.flick, 0);
	assert.equal(jump.state.rate, 0);
	assert.ok(Math.abs(jump.state.x) < 1e-9);
});
