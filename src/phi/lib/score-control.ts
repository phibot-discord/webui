export const MAX_SCORE = 1_000_000;
export const MAX_NOTES = 5000;
export const SCORE_TOLERANCE = 1;
const JUDGE_BASE = 900_000;
const COMBO_BASE = 100_000;
const GOOD_WEIGHT = 0.65;

export type ScoreMode = "normal" | "challenge";

export type ScorePlan = {
	perfect: number;
	good: number;
	badMiss: number;
	maxCombo: number;
	acc: number;
	exact: number;
	delta: number;
};

export type ScorePlanResult = {
	plans: ScorePlan[];
	nearest?: { below?: number; above?: number };
};

export function accuracyOf(perfect: number, good: number, total: number) {
	if (total <= 0) return 0;
	return ((perfect + GOOD_WEIGHT * good) / total) * 100;
}

function judgePart(
	perfect: number,
	good: number,
	total: number,
	mode: ScoreMode,
) {
	const base = mode === "challenge" ? MAX_SCORE : JUDGE_BASE;
	return ((perfect + GOOD_WEIGHT * good) / total) * base;
}

export function exactScore(
	perfect: number,
	good: number,
	maxCombo: number,
	total: number,
	mode: ScoreMode = "normal",
) {
	if (total <= 0) return 0;
	const judge = judgePart(perfect, good, total, mode);
	if (mode === "challenge") return judge;
	return judge + (maxCombo / total) * COMBO_BASE;
}

export function scoreFor(
	perfect: number,
	good: number,
	maxCombo: number,
	total: number,
	mode: ScoreMode = "normal",
) {
	return Math.round(exactScore(perfect, good, maxCombo, total, mode));
}

export function comboFeasible(
	perfect: number,
	good: number,
	badMiss: number,
	maxCombo: number,
	total: number,
) {
	const hit = perfect + good;
	if (badMiss === 0) return maxCombo === total;
	if (maxCombo < 0 || maxCombo > hit) return false;
	return maxCombo >= Math.ceil(hit / (badMiss + 1));
}

function validNotes(total: unknown): total is number {
	return (
		typeof total === "number" &&
		Number.isInteger(total) &&
		total > 0 &&
		total <= MAX_NOTES
	);
}

function validTarget(target: unknown): target is number {
	return (
		typeof target === "number" &&
		Number.isInteger(target) &&
		target >= 0 &&
		target <= MAX_SCORE
	);
}

export function hitsTarget(exact: number, target: number) {
	return Math.abs(exact - target) < SCORE_TOLERANCE;
}

function comparePlans(mode: ScoreMode) {
	return (a: ScorePlan, b: ScorePlan) => {
		const da = Math.abs(a.delta);
		const db = Math.abs(b.delta);
		if (Math.abs(da - db) > 1e-9) return da - db;
		if (a.good !== b.good) return a.good - b.good;
		if (mode === "normal") {
			const ca = Math.abs(a.perfect - a.maxCombo);
			const cb = Math.abs(b.perfect - b.maxCombo);
			if (ca !== cb) return ca - cb;
		}
		return b.perfect - a.perfect;
	};
}

function plan(
	perfect: number,
	good: number,
	total: number,
	maxCombo: number,
	exact: number,
	target: number,
): ScorePlan {
	return {
		perfect,
		good,
		badMiss: total - perfect - good,
		maxCombo,
		acc: accuracyOf(perfect, good, total),
		exact,
		delta: exact - target,
	};
}

function collectNormal(total: number, target: number): ScorePlan[] {
	const out: ScorePlan[] = [];
	const tol = SCORE_TOLERANCE;
	for (let p = 0; p <= total; p++) {
		// judge(g) ≤ target + tol and judge(g) + comboMax(g) ≥ target − tol
		const gHi = (((target + tol) * total) / JUDGE_BASE - p) / GOOD_WEIGHT;
		const gLo =
			((target - tol) * total - MAX_SCORE * p) /
			(JUDGE_BASE * GOOD_WEIGHT + COMBO_BASE);
		const from = Math.max(0, Math.floor(gLo) - 1);
		const to = Math.min(total - p, Math.ceil(gHi) + 1);
		for (let g = from; g <= to; g++) {
			const judge = judgePart(p, g, total, "normal");
			const cLo = Math.max(
				0,
				Math.ceil(((target - tol - judge) * total) / COMBO_BASE) - 1,
			);
			const cHi = Math.min(
				p + g,
				Math.floor(((target + tol - judge) * total) / COMBO_BASE) + 1,
			);
			for (let c = cLo; c <= cHi; c++) {
				const exact = judge + (c / total) * COMBO_BASE;
				if (!hitsTarget(exact, target)) continue;
				if (!comboFeasible(p, g, total - p - g, c, total)) continue;
				out.push(plan(p, g, total, c, exact, target));
			}
		}
	}
	return out;
}

function collectChallenge(total: number, target: number): ScorePlan[] {
	const out: ScorePlan[] = [];
	const tol = SCORE_TOLERANCE;
	for (let p = 0; p <= total; p++) {
		const gLo = (((target - tol) * total) / MAX_SCORE - p) / GOOD_WEIGHT;
		const gHi = (((target + tol) * total) / MAX_SCORE - p) / GOOD_WEIGHT;
		const from = Math.max(0, Math.floor(gLo) - 1);
		const to = Math.min(total - p, Math.ceil(gHi) + 1);
		for (let g = from; g <= to; g++) {
			const exact = judgePart(p, g, total, "challenge");
			if (!hitsTarget(exact, target)) continue;
			out.push(plan(p, g, total, p + g, exact, target));
		}
	}
	return out;
}

function collect(total: number, target: number, mode: ScoreMode) {
	if (target === 0) return [plan(0, 0, total, 0, 0, 0)];
	return mode === "challenge"
		? collectChallenge(total, target)
		: collectNormal(total, target);
}

const NEAREST_SPAN = 400;

function nearest(total: number, target: number, mode: ScoreMode) {
	let below: number | undefined;
	let above: number | undefined;
	for (let d = 1; d <= NEAREST_SPAN && (below == null || above == null); d++) {
		if (
			below == null &&
			target - d >= 0 &&
			collect(total, target - d, mode).length
		)
			below = target - d;
		if (
			above == null &&
			target + d <= MAX_SCORE &&
			collect(total, target + d, mode).length
		)
			above = target + d;
	}
	return below == null && above == null ? undefined : { below, above };
}

export function planScore(
	total: number,
	target: number,
	mode: ScoreMode = "normal",
): ScorePlanResult {
	if (!validNotes(total) || !validTarget(target)) return { plans: [] };
	const plans = collect(total, target, mode).sort(comparePlans(mode));
	if (plans.length) return { plans };
	return { plans: [], nearest: nearest(total, target, mode) };
}
