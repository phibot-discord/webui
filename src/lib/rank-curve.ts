export type BoardCurve = {
	n: number;
	ap: number;
	fc: number;
	q: number[];
	at: number;
};

export type CurveRank = { rank: number; of: number; top: number; tied: number };

const idxAt = (k: number, steps: number, n: number) =>
	k === 0 ? 0 : Math.min(n - 1, Math.ceil((k / steps) * n) - 1);

export function boardRank(board: BoardCurve, acc: number): CurveRank | null {
	const { n, q } = board;
	if (!(n > 0) || q.length < 2) return null;
	const of = n + 1;
	if (acc >= 100) {
		return { rank: 1, of, top: (1 / of) * 100, tied: board.ap };
	}
	const steps = q.length - 1;
	let better = n;
	if (acc > (q[0] ?? 0)) better = 0;
	else {
		for (let k = 1; k <= steps; k++) {
			const hi = q[k - 1] ?? 0;
			const lo = q[k] ?? 0;
			if (lo >= acc) continue;
			const a = idxAt(k - 1, steps, n) + 1;
			const b = idxAt(k, steps, n);
			const frac = hi > lo ? (hi - acc) / (hi - lo) : 0;
			better = Math.round(a + frac * Math.max(0, b - a));
			break;
		}
	}
	const rank = Math.min(of, better + 1);
	return { rank, of, top: (rank / of) * 100, tied: 0 };
}

export function milestones(acc: number | null): number[] {
	if (acc == null || !(acc > 0)) return [98, 99, 99.5, 100];
	if (acc >= 100) return [100];
	const out = [acc];
	for (const step of [0.25, 0.5, 1]) {
		const next = Math.round((acc + step) * 100) / 100;
		if (next < 100) out.push(next);
	}
	out.push(100);
	return out;
}

export function curveLow(board: BoardCurve): number {
	const steps = board.q.length - 1;
	const at = Math.min(steps, Math.round(steps * 0.95));
	const lo = board.q[at] ?? 90;
	return Math.max(70, Math.floor(Math.min(lo, 99) * 2) / 2);
}

export function curvePoints(
	board: BoardCurve,
	lo: number,
): [acc: number, top: number][] {
	const steps = board.q.length - 1;
	if (steps < 1) return [];
	const out: [number, number][] = [];
	for (let k = 0; k <= steps; k++) {
		const acc = board.q[k] ?? 0;
		if (acc < lo) break;
		out.push([acc, Math.max(100 / (board.n + 1), (k / steps) * 100)]);
	}
	return out;
}
