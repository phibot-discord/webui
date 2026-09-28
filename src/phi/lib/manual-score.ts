/**
 * "No account" mode: scores typed by hand instead of pulled from TapTap.
 * Pure helpers shared by the browser editor and the server-side save builder.
 */

import { LEVEL, type LevelKind } from "./const";
import { fCompute } from "./fcompute";

export const MANUAL_MAX_RECORDS = 2000;
export const MANUAL_NAME_MAX = 32;

export type ManualRecord = {
	id: string;
	rank: LevelKind;
	acc: number;
	score?: number;
	fc?: boolean;
};

export type ManualSaveData = {
	v: 1;
	playerId: string;
	records: ManualRecord[];
	updatedAt: string;
	rks: number;
};

export function manualRecordKey(id: string, rank: string) {
	return `${id}|${rank}`;
}

export function isLevelKind(v: unknown): v is LevelKind {
	return (LEVEL as readonly string[]).includes(String(v));
}

export function roundAcc(acc: number) {
	return Math.round(acc * 1e6) / 1e6;
}

export function validAcc(v: unknown): v is number {
	return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
}

export function validScore(v: unknown): v is number {
	return (
		typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1_000_000
	);
}

export function estimateScore(acc: number, fc: boolean) {
	if (acc >= 100) return 1_000_000;
	const judge = (acc / 100) * 900_000;
	const combo = fc ? 100_000 : (acc / 100) * 100_000;
	return Math.round(judge + combo);
}

export function effectiveScore(
	rec: Pick<ManualRecord, "acc" | "score" | "fc">,
) {
	return rec.score ?? estimateScore(rec.acc, rec.fc === true || rec.acc >= 100);
}

/** In-game RKS: three best AP charts plus the best 27 overall, over 30. */
export function rankingScoreOf(rows: { acc: number; rks: number }[]) {
	const sorted = rows
		.filter((r) => Number.isFinite(r.rks))
		.sort((a, b) => b.rks - a.rks);
	let sum = 0;
	let phi = 0;
	for (const r of sorted) {
		if (phi >= 3) break;
		if (r.acc >= 100) {
			sum += r.rks;
			phi += 1;
		}
	}
	for (let i = 0; i < 27 && i < sorted.length; i++) sum += sorted[i]!.rks;
	return sum / 30;
}

export function chartRks(acc: number, difficulty: number) {
	return fCompute.rks(acc, difficulty);
}
