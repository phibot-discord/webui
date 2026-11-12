type Frame = readonly [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
];

export type MotionState = {
	t: number | null;
	frame: Frame | null;
	rate: number;
	leanX: number;
	leanY: number;
	x: number;
	y: number;
	quietUntil: number;
};

export type MotionSample = {
	t: number;
	alpha: number;
	beta: number;
	gamma: number;
};

export const MOTION_START: MotionState = {
	t: null,
	frame: null,
	rate: 0,
	leanX: 0,
	leanY: 0,
	x: 0,
	y: 0,
	quietUntil: 0,
};

const REACH = 28;
const FLICK_RATE = 240;
const FLICK_QUIET_MS = 700;
const JUMP = 60;
const GAP_S = 0.25;
const RATE_S = 0.025;
const SETTLE_S = 0.8;
const EASE_S = 0.055;
const RAD = Math.PI / 180;

const unit = (v: number) => Math.max(-1, Math.min(1, v));
const toward = (dt: number, span: number) => 1 - Math.exp(-dt / span);

function frameOf({ alpha, beta, gamma }: MotionSample): Frame {
	const cZ = Math.cos(alpha * RAD);
	const sZ = Math.sin(alpha * RAD);
	const cX = Math.cos(beta * RAD);
	const sX = Math.sin(beta * RAD);
	const cY = Math.cos(gamma * RAD);
	const sY = Math.sin(gamma * RAD);
	return [
		cZ * cY - sZ * sX * sY,
		-cX * sZ,
		cY * sZ * sX + cZ * sY,
		cY * sZ + cZ * sX * sY,
		cZ * cX,
		sZ * sY - cZ * cY * sX,
		-cX * sY,
		sX,
		cX * cY,
	];
}

function turnBetween(
	from: Frame,
	to: Frame,
): { x: number; y: number; angle: number } {
	const at = (row: number, col: number) =>
		(from[row] ?? 0) * (to[col] ?? 0) +
		(from[row + 3] ?? 0) * (to[col + 3] ?? 0) +
		(from[row + 6] ?? 0) * (to[col + 6] ?? 0);
	const x = (at(2, 1) - at(1, 2)) / 2;
	const y = (at(0, 2) - at(2, 0)) / 2;
	const z = (at(1, 0) - at(0, 1)) / 2;
	const sine = Math.hypot(x, y, z);
	const angle = Math.atan2(sine, (at(0, 0) + at(1, 1) + at(2, 2) - 1) / 2);
	const scale = sine > 1e-9 ? angle / sine / RAD : 1 / RAD;
	return { x: x * scale, y: y * scale, angle: angle / RAD };
}

export function motionStep(
	state: MotionState,
	sample: MotionSample,
): { state: MotionState; flick: -1 | 0 | 1 } {
	if (
		!Number.isFinite(sample.alpha) ||
		!Number.isFinite(sample.beta) ||
		!Number.isFinite(sample.gamma)
	)
		return { state, flick: 0 };
	const frame = frameOf(sample);
	if (state.t === null || state.frame === null)
		return { state: { ...MOTION_START, t: sample.t, frame }, flick: 0 };
	const dt = (sample.t - state.t) / 1000;
	if (!(dt > 0)) return { state, flick: 0 };
	const turn = turnBetween(state.frame, frame);
	const broken = dt > GAP_S || turn.angle > JUMP;
	const rate = broken
		? 0
		: state.rate + (turn.y / dt - state.rate) * toward(dt, RATE_S);
	const fade = Math.exp(-dt / SETTLE_S);
	const leanX = (state.leanX + (broken ? 0 : turn.y)) * fade;
	const leanY = (state.leanY + (broken ? 0 : turn.x)) * fade;
	const ease = toward(dt, EASE_S);
	const fast = Math.abs(rate) >= FLICK_RATE && sample.t >= state.quietUntil;
	return {
		state: {
			t: sample.t,
			frame,
			rate,
			leanX,
			leanY,
			x: state.x + (unit(leanX / REACH) - state.x) * ease,
			y: state.y + (unit(leanY / REACH) - state.y) * ease,
			quietUntil: fast ? sample.t + FLICK_QUIET_MS : state.quietUntil,
		},
		flick: fast ? (rate > 0 ? 1 : -1) : 0,
	};
}
