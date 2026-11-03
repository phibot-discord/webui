import assert from "node:assert/strict";
import test from "node:test";
import {
	AREA_STRIDE,
	AreaBuilder,
	areaLevel,
	areaPose,
	compileAreas,
	DISABLED_LEVEL,
	ease,
	type Pose,
} from "./areas";
import { ASPECT } from "./base";
import { chordTints, compileChart } from "./chart";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-5;
const pose = (): Pose => ({ x: 0, y: 0, hx: 0, hy: 0, angle: 0 });

function area(extra: Record<string, unknown> = {}) {
	return {
		bottomLeftPercentage: { x: 0.25, y: 0.25 },
		topRightPercentage: { x: 0.75, y: 0.75 },
		appearTime: 1,
		enableTime: 2,
		disableTime: 3,
		disappearTime: 4,
		isSubtract: false,
		moveEvents: [],
		rotateEvents: [],
		scaleEvents: [],
		...extra,
	};
}

test("easing is the power table: in, out, in-out, zero and one", () => {
	assert.ok(near(ease(0, 0.3), 0.3));
	assert.ok(near(ease(1, 0.5), 0.25));
	assert.ok(near(ease(2, 0.5), 0.75));
	assert.ok(near(ease(3, 0.25), 0.125));
	assert.ok(near(ease(4, 0.5), 0.125));
	assert.ok(near(ease(10, 0.5), 0.03125));
	assert.equal(ease(13, 0.9), 0);
	assert.equal(ease(14, 0), 1);
});

test("percent rectangles map onto the screen, y scaled by the aspect", () => {
	const a = compileAreas([
		area({
			bottomLeftPercentage: { x: 0, y: 0 },
			topRightPercentage: { x: 1, y: 1 },
		}),
	]);
	assert.equal(a.count, 1);
	assert.ok(near(a.cx[0]!, 0) && near(a.cy[0]!, 0));
	assert.ok(near(a.w[0]!, 2) && near(a.h[0]!, 2 / ASPECT));
});

test("phases: fade in, ready, active, disabled again, hidden", () => {
	const a = compileAreas([area()]);
	assert.ok(near(areaLevel(a, 0, 1.25), 0.5 * DISABLED_LEVEL));
	assert.equal(areaLevel(a, 0, 1.6), 1);
	assert.equal(areaLevel(a, 0, 2), 2);
	assert.equal(areaLevel(a, 0, 3.5), DISABLED_LEVEL);
	const b = new AreaBuilder(a);
	assert.equal(b.build(0.9), 0);
	assert.equal(b.build(2.5), 1);
	assert.equal(b.build(4), 0);
});

test("an area that starts active has no ready phase and times are ordered", () => {
	const a = compileAreas([
		area({ appearTime: 2, enableTime: 1, disableTime: 0, disappearTime: 5 }),
	]);
	assert.equal(a.enable[0], 2);
	assert.equal(a.disable[0], 2);
	assert.equal(areaLevel(a, 0, 1.9), DISABLED_LEVEL);
	assert.equal(areaLevel(a, 0, 2), DISABLED_LEVEL);
});

test("move events place the centre and ease between them", () => {
	const a = compileAreas([
		area({
			moveEvents: [
				{
					endPosition: { x: 0.5, y: 0.5 },
					time: 1,
					easeTypeX: 0,
					easeTypeY: 0,
				},
				{
					endPosition: { x: 0.8, y: 0.5 },
					time: 2,
					easeTypeX: 0,
					easeTypeY: 0,
				},
			],
		}),
	]);
	assert.ok(near(areaPose(a, 0, 1.5, pose()).x, 0.3));
	assert.ok(near(areaPose(a, 0, 0, pose()).x, 0));
	assert.ok(near(areaPose(a, 0, 9, pose()).x, 0.6));
});

test("rotation turns the area around its anchor", () => {
	const a = compileAreas([
		area({
			rotateEvents: [
				{ anchor: { x: 0.25, y: 0.5 }, time: 0, rotation: 0, easeType: 0 },
				{ anchor: { x: 0.25, y: 0.5 }, time: 1, rotation: 90, easeType: 0 },
			],
		}),
	]);
	const p = areaPose(a, 0, 1, pose());
	assert.ok(near(p.angle, Math.PI / 2));
	assert.ok(near(p.x, -0.5));
	assert.ok(near(p.y, 0.5));
});

test("scale grows the size around its anchor", () => {
	const a = compileAreas([
		area({
			scaleEvents: [
				{ anchor: { x: 0.25, y: 0.5 }, time: 0, scale: { x: 1, y: 1 } },
				{ anchor: { x: 0.25, y: 0.5 }, time: 1, scale: { x: 2, y: 1 } },
			],
		}),
	]);
	const p = areaPose(a, 0, 1, pose());
	assert.ok(near(p.hx, 1));
	assert.ok(near(p.x, 0.5));
});

test("areas with unknown ease types or bad numbers are dropped", () => {
	const a = compileAreas([
		area({
			moveEvents: [
				{
					endPosition: { x: 0.5, y: 0.5 },
					time: 1,
					easeTypeX: 15,
					easeTypeY: 0,
				},
			],
		}),
		area({ appearTime: "x" }),
		area(),
	]);
	assert.equal(a.count, 1);
});

test("mask instances: normal union first, then active and idle subtract", () => {
	const a = compileAreas([
		area({ isSubtract: true }),
		area(),
		area({ isSubtract: true, enableTime: 9, disableTime: 9, disappearTime: 9 }),
		area({ enableTime: 2.2, disableTime: 9, disappearTime: 9 }),
	]);
	const b = new AreaBuilder(a);
	const n = b.build(2.5);
	assert.equal(n, 4);
	assert.deepEqual(b.counts, { normal: 2, activeSub: 1, idleSub: 1, total: 4 });
	const ch = (k: number) =>
		Array.from(b.data.subarray(k * AREA_STRIDE + 8, k * AREA_STRIDE + 12));
	assert.deepEqual(ch(0), [1, 0, 0, 0]);
	assert.deepEqual(ch(1), [1, 0, 0, 0]);
	assert.deepEqual(ch(2), [0, 1, 0, 0]);
	assert.deepEqual(ch(3), [0, 0, 0, 1]);
});

test("the time index finds areas across slice boundaries", () => {
	const a = compileAreas([
		area({
			appearTime: 5.2,
			enableTime: 6,
			disableTime: 7,
			disappearTime: 7.9,
		}),
	]);
	const b = new AreaBuilder(a);
	assert.equal(b.build(6.5), 1);
	assert.equal(b.build(7.95), 0);
	assert.equal(b.build(5.1), 0);
	assert.equal(a.peak, 1);
});

test("charts without blockAreaList compile with no areas", () => {
	const c = compileChart({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			{
				bpm: 120,
				judgeLineMoveEvents: [],
				judgeLineRotateEvents: [],
				judgeLineDisappearEvents: [],
				speedEvents: [],
				notesAbove: [],
				notesBelow: [],
			},
		],
		blockAreaList: null,
	});
	assert.equal(c.areas.count, 0);
});

test("crowded chords get distinct tints, lone pairs stay gold", () => {
	const tint = chordTints([1, 1, 1.1, 1.1, 3, 3, 5, 5, 5, 7]);
	assert.deepEqual([...tint], [1, 1, 2, 2, 0, 0, 1, 1, 1, 0]);
});
