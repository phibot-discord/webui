import {
	chartPoints,
	type DatedValue,
	dayEndMs,
	type ScoreHistoryMap,
	shanghaiDay,
	valueAt,
} from "./past-self";

const DAY_MS = 86_400_000;
export const TYPE_WINDOW_DAYS = 365;

export type PgtiWindow = {
	days: string[];
	first: string;
	last: string;
	rks: { start: number | null; end: number | null };
};

export function pgtiWindow(
	history: ScoreHistoryMap,
	rks: readonly DatedValue[],
	now: number,
	span = TYPE_WINDOW_DAYS,
): PgtiWindow | null {
	const seen = new Set<string>();
	let earliest: string | null = null;
	for (const levels of Object.values(history)) {
		for (const rows of Object.values(levels ?? {})) {
			for (const p of chartPoints(rows)) {
				if (p[0] > now) continue;
				const day = shanghaiDay(p[0]);
				seen.add(day);
				if (earliest === null || day < earliest) earliest = day;
			}
		}
	}
	if (earliest === null) return null;
	const last = shanghaiDay(now);
	const opened = shanghaiDay(now - span * DAY_MS);
	const first = opened > earliest ? opened : earliest;
	const baseline = earliest;
	const days = [...seen]
		.filter((day) => day !== baseline && day > first && day <= last)
		.sort();
	const cutoff = dayEndMs(first);
	return {
		days,
		first,
		last,
		rks: {
			start: cutoff === undefined ? null : valueAt(rks, cutoff),
			end: valueAt(rks, now),
		},
	};
}
