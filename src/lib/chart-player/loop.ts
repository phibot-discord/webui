export type Loop = readonly [from: number, to: number];

export const LOOP_MIN = 1;

export function loopOf(a: number, b: number, duration: number): Loop | null {
	if (!(duration > 0) || !Number.isFinite(a) || !Number.isFinite(b))
		return null;
	const clamp = (v: number) => Math.min(Math.max(0, v), duration);
	const from = clamp(Math.min(a, b));
	const to = clamp(Math.max(a, b));
	return to - from >= LOOP_MIN ? [from, to] : null;
}

export function withStart(
	loop: Loop | null,
	pos: number,
	span: number,
	duration: number,
): Loop | null {
	const to = loop && loop[1] - pos >= LOOP_MIN ? loop[1] : pos + span;
	return loopOf(pos, to, duration);
}

export function withEnd(
	loop: Loop | null,
	pos: number,
	span: number,
	duration: number,
): Loop | null {
	const from = loop && pos - loop[0] >= LOOP_MIN ? loop[0] : pos - span;
	return loopOf(from, pos, duration);
}

export function loopBand(loop: Loop, duration: number): string {
	if (!(duration > 0)) return "";
	const x0 = (loop[0] / duration) * 100;
	const w = ((loop[1] - loop[0]) / duration) * 100;
	return `M${x0.toFixed(2)} 0h${w.toFixed(2)}v10h-${w.toFixed(2)}z`;
}
