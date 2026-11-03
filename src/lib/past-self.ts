import { fCompute } from "@/phi/lib/fcompute";
import type { CompareRecord } from "./compare";

export type HistoryRow = readonly [
	acc: string | number,
	score: number,
	date: string | Date,
	fc: boolean,
];

export type ScoreHistoryMap = Readonly<
	Record<string, Partial<Record<string, readonly HistoryRow[]>> | undefined>
>;

export type DatedValue = { date: string | Date; value: number };

export type ChartPoint = [t: number, acc: number, score: number, fc: boolean];

const SHANGHAI_MS = 8 * 3_600_000;
const DAY_MS = 86_400_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PAST = /^me@(\d{4}-\d{2}-\d{2})$/i;
const DAYS_MAX = 400;

const timeOf = (d: string | Date) =>
	d instanceof Date ? d.getTime() : Date.parse(d);

export function shanghaiDay(t: number): string {
	return new Date(t + SHANGHAI_MS).toISOString().slice(0, 10);
}

export function dayEndMs(day: string): number | undefined {
	if (!DAY.test(day)) return undefined;
	const start = Date.parse(`${day}T00:00:00Z`);
	if (!Number.isFinite(start)) return undefined;
	if (new Date(start).toISOString().slice(0, 10) !== day) return undefined;
	return start - SHANGHAI_MS + DAY_MS - 1;
}

export function parsePastInput(raw: string): string | undefined {
	const day = PAST.exec(raw.trim())?.[1];
	return day && dayEndMs(day) !== undefined ? day : undefined;
}

export function chartPoints(
	rows: readonly HistoryRow[] | undefined,
): ChartPoint[] {
	const out: ChartPoint[] = [];
	for (const row of rows ?? []) {
		const t = timeOf(row[2]);
		const acc = Number(row[0]);
		const score = Number(row[1]);
		if (!Number.isFinite(t) || !Number.isFinite(acc)) continue;
		out.push([t, acc, Number.isFinite(score) ? score : 0, Boolean(row[3])]);
	}
	out.sort((a, b) => a[0] - b[0]);
	return out;
}

export function recordsAt(
	history: ScoreHistoryMap,
	cutoff: number,
	constantOf: (id: string, rank: string) => number | undefined,
): CompareRecord[] {
	const out: CompareRecord[] = [];
	for (const [id, levels] of Object.entries(history)) {
		for (const [rank, rows] of Object.entries(levels ?? {})) {
			const constant = constantOf(id, rank);
			if (!constant || !(constant > 0)) continue;
			let last: ChartPoint | undefined;
			for (const p of chartPoints(rows)) {
				if (p[0] > cutoff) break;
				last = p;
			}
			if (!last || !(last[2] > 0)) continue;
			const acc = Number(last[1].toFixed(4));
			out.push([
				id,
				rank,
				acc,
				last[2],
				last[3],
				constant,
				fCompute.rks(acc, constant),
			]);
		}
	}
	return out;
}

export function valueAt(
	list: readonly DatedValue[],
	cutoff: number,
): number | null {
	let best: { t: number; value: number } | undefined;
	for (const item of list) {
		const t = timeOf(item.date);
		if (!Number.isFinite(t) || t > cutoff || !Number.isFinite(item.value)) {
			continue;
		}
		if (!best || t >= best.t) best = { t, value: item.value };
	}
	return best ? best.value : null;
}

export function historyDays(
	rks: readonly DatedValue[],
	history: ScoreHistoryMap,
): string[] {
	const days = new Set<string>();
	for (const item of rks) {
		const t = timeOf(item.date);
		if (Number.isFinite(t)) days.add(shanghaiDay(t));
	}
	for (const levels of Object.values(history)) {
		for (const rows of Object.values(levels ?? {})) {
			for (const p of chartPoints(rows)) days.add(shanghaiDay(p[0]));
		}
	}
	const sorted = [...days].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
	return sorted.slice(1, DAYS_MAX + 1);
}
