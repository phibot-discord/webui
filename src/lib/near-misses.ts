import type { LevelKind } from "@/phi/lib/const";
import {
	accuracyOf,
	comboFeasible,
	exactScore,
	hitsTarget,
	MAX_NOTES,
	MAX_SCORE,
} from "@/phi/lib/score-control";

export const AP_GOODS_MAX = 10;
export const BREAK_GOODS_LIMIT = 20;
export const NEAR_LIST_MAX = 20;
export const ACC_FLOOR_SLACK = 0.001;
export const BREAK_ACC_SLACK = 0.1;

export type NearRecord = {
	id: string;
	rank: LevelKind;
	c: number;
	score: number;
	acc: number;
	fc: boolean;
	notes: number | null;
};

export type NearAp = {
	id: string;
	rank: LevelKind;
	c: number;
	score: number;
	acc: number;
	goods: number;
};

export type NearBreak = NearAp & { combo: number; notes: number };

export type NearMisses = { ap: NearAp[]; breaks: NearBreak[] };

function validNotes(notes: number | null | undefined): notes is number {
	return (
		typeof notes === "number" &&
		Number.isInteger(notes) &&
		notes >= 1 &&
		notes <= MAX_NOTES
	);
}

export function goodsFromAp(
	notes: number,
	score: number,
	acc: number,
): number | undefined {
	if (!validNotes(notes) || !(score > 0) || score >= MAX_SCORE) return;
	if (!Number.isFinite(acc)) return;
	const perGood = MAX_SCORE - exactScore(notes - 1, 1, notes, notes);
	const goods = Math.round((MAX_SCORE - score) / perGood);
	if (goods < 1 || goods > notes) return;
	if (!hitsTarget(exactScore(notes - goods, goods, notes, notes), score))
		return;
	if (acc < accuracyOf(notes - goods, goods, notes) - ACC_FLOOR_SLACK) return;
	return goods;
}

export function breakReading(
	notes: number,
	score: number,
	acc: number,
): { goods: number; combo: number } | undefined {
	if (!validNotes(notes) || !(score > 0) || !Number.isFinite(acc)) return;
	const last = Math.min(BREAK_GOODS_LIMIT - 1, notes - 1);
	for (let goods = 0; goods <= last; goods++) {
		const perfect = notes - 1 - goods;
		const implied = accuracyOf(perfect, goods, notes);
		if (Math.abs(implied - acc) * notes >= BREAK_ACC_SLACK) continue;
		const bare = exactScore(perfect, goods, 0, notes);
		const perCombo = exactScore(perfect, goods, 1, notes) - bare;
		const combo = Math.round((score - bare) / perCombo);
		if (!comboFeasible(perfect, goods, 1, combo, notes)) return;
		if (!hitsTarget(exactScore(perfect, goods, combo, notes), score)) return;
		return { goods, combo };
	}
}

function byGoods(a: NearAp, b: NearAp) {
	return (
		a.goods - b.goods ||
		b.c - a.c ||
		(a.id < b.id ? -1 : a.id > b.id ? 1 : 0) ||
		(a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0)
	);
}

export function nearMisses(records: readonly NearRecord[]): NearMisses {
	const ap: NearAp[] = [];
	const breaks: NearBreak[] = [];
	for (const r of records) {
		const { notes } = r;
		if (!validNotes(notes) || !(r.score > 0)) continue;
		const head = { id: r.id, rank: r.rank, c: r.c, score: r.score, acc: r.acc };
		if (r.fc) {
			const goods = goodsFromAp(notes, r.score, r.acc);
			if (goods != null && goods <= AP_GOODS_MAX) ap.push({ ...head, goods });
			continue;
		}
		const read = breakReading(notes, r.score, r.acc);
		if (read) breaks.push({ ...head, ...read, notes });
	}
	return {
		ap: ap.sort(byGoods).slice(0, NEAR_LIST_MAX),
		breaks: breaks.sort(byGoods).slice(0, NEAR_LIST_MAX),
	};
}
