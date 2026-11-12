import {
	chartPoints,
	type DatedValue,
	dayEndMs,
	type ScoreHistoryMap,
	shanghaiDay,
	valueAt,
} from "./past-self";

const DAY_MS = 86_400_000;
export const CALENDAR_WEEKS = 53;
const LEVELS = 4;

export type CalendarCell = { day: string; charts: number; level: number };

export type PlayCalendar = {
	weeks: (CalendarCell | null)[][];
	active: number;
	total: number;
	best: { day: string; charts: number } | null;
};

export type OnThisDay = {
	years: number;
	day: string;
	rks: number | null;
	charts: number;
};

const dayStart = (day: string) => Date.parse(`${day}T00:00:00Z`);
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function dayCounts(history: ScoreHistoryMap) {
	const counts = new Map<string, number>();
	let first: string | null = null;
	for (const levels of Object.values(history)) {
		for (const rows of Object.values(levels ?? {})) {
			for (const p of chartPoints(rows)) {
				const day = shanghaiDay(p[0]);
				counts.set(day, (counts.get(day) ?? 0) + 1);
				if (first === null || day < first) first = day;
			}
		}
	}
	if (first !== null) counts.delete(first);
	return { counts, first };
}

export function playCalendar(
	history: ScoreHistoryMap,
	now: number,
	weeks = CALENDAR_WEEKS,
): PlayCalendar {
	const { counts } = dayCounts(history);
	const today = dayStart(shanghaiDay(now));
	const weekday = (new Date(today).getUTCDay() + 6) % 7;
	const start = today - (weekday + (weeks - 1) * 7) * DAY_MS;
	const flat: { day: string; charts: number }[] = [];
	let max = 0;
	let active = 0;
	let total = 0;
	let best: PlayCalendar["best"] = null;
	for (let t = start; t <= today; t += DAY_MS) {
		const day = dayOf(t);
		const charts = counts.get(day) ?? 0;
		flat.push({ day, charts });
		if (charts > 0) {
			active++;
			total += charts;
		}
		if (charts > max) {
			max = charts;
			best = { day, charts };
		}
	}
	const scale = Math.log1p(max);
	const out: (CalendarCell | null)[][] = [];
	for (let w = 0; w < weeks; w++) {
		const column: (CalendarCell | null)[] = [];
		for (let d = 0; d < 7; d++) {
			const cell = flat[w * 7 + d];
			column.push(
				cell
					? {
							...cell,
							level:
								cell.charts === 0
									? 0
									: Math.min(
											LEVELS,
											Math.max(
												1,
												Math.ceil((Math.log1p(cell.charts) / scale) * LEVELS),
											),
										),
						}
					: null,
			);
		}
		out.push(column);
	}
	return { weeks: out, active, total, best };
}

function yearsBefore(day: string, years: number): string {
	const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
	const target = new Date(Date.UTC(y - years, m - 1, d));
	if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
	return target.toISOString().slice(0, 10);
}

export function onThisDay(
	history: ScoreHistoryMap,
	rks: readonly DatedValue[],
	now: number,
	maxYears = 3,
): OnThisDay[] {
	const { counts, first } = dayCounts(history);
	let start = first;
	for (const item of rks) {
		const t =
			item.date instanceof Date ? item.date.getTime() : Date.parse(item.date);
		if (!Number.isFinite(t)) continue;
		const day = shanghaiDay(t);
		if (start === null || day < start) start = day;
	}
	if (start === null) return [];
	const today = shanghaiDay(now);
	const out: OnThisDay[] = [];
	for (let years = 1; years <= maxYears; years++) {
		const day = yearsBefore(today, years);
		if (day < start) break;
		const cutoff = dayEndMs(day);
		if (cutoff === undefined) continue;
		out.push({
			years,
			day,
			rks: valueAt(rks, cutoff),
			charts: counts.get(day) ?? 0,
		});
	}
	return out;
}
