import { fCompute } from "@/phi/lib/fcompute";
import {
	type ChartPoint,
	chartPoints,
	type ScoreHistoryMap,
} from "./past-self";
import { isAp } from "./wrapped";

export type PgtiFamily = "collector" | "crafter" | "adventurer" | "challenger";
export type PgtiStyle = "clockwork" | "ambush" | "grinder" | "fireworks";

export type Pgti = {
	code: string;
	aim: { letter: "P" | "R"; acc: number };
	range: { letter: "E" | "F"; played: number; total: number };
	grip: { letter: "S" | "W"; fc: number; total: number };
	pace: { letter: "M" | "B"; months: number; total: number };
	drive: { letter: "G" | "K"; gain: number } | null;
	family: PgtiFamily;
	style: PgtiStyle;
};

const MIN_RECORDS = 10;
const BEST_COUNT = 27;
const AIM_ACC = 98;
const RANGE_BELOW = 1;
const RANGE_SHARE = 0.6;
const GRIP_ACC = 97;
const GRIP_MIN = 5;
const GRIP_SHARE = 0.5;
const PACE_SHARE = 0.6;
const DRIVE_GAIN = 0.25;

type Played = { c: number; acc: number; fc: boolean };

const monthIndex = (day: string) =>
	Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;

const mean = (values: readonly number[]) =>
	values.reduce((sum, v) => sum + v, 0) / values.length;

export function pgtiOf(input: {
	history: ScoreHistoryMap;
	constantOf: (id: string, rank: string) => number | undefined;
	constants: readonly number[];
	until: number;
	days: readonly string[];
	first: string;
	last: string;
	rks?: { start: number | null; end: number | null };
}): Pgti | null {
	const records: Played[] = [];
	for (const [id, levels] of Object.entries(input.history)) {
		for (const [rank, rows] of Object.entries(levels ?? {})) {
			const c = input.constantOf(id, rank);
			if (c === undefined || !(c > 0)) continue;
			const point: ChartPoint | undefined = chartPoints(rows)
				.filter(([t]) => t <= input.until)
				.at(-1);
			if (!point || !(point[2] > 0)) continue;
			records.push({ c, acc: point[1], fc: point[3] || isAp(point) });
		}
	}
	if (records.length < MIN_RECORDS) return null;

	const best = [...records]
		.sort(
			(a, b) =>
				fCompute.rks(b.acc, b.c) - fCompute.rks(a.acc, a.c) || b.c - a.c,
		)
		.slice(0, BEST_COUNT);
	const acc = mean(best.map((r) => r.acc));
	const zone = mean(best.map((r) => r.c));

	const floor = zone - RANGE_BELOW;
	const total = input.constants.filter((c) => c >= floor).length;
	const played = records.filter((r) => r.c >= floor).length;

	const sharp = records.filter((r) => r.acc >= GRIP_ACC);
	const good = sharp.length < GRIP_MIN ? records : sharp;
	const combos = good.filter((r) => r.fc).length;

	const monthsTotal = monthIndex(input.last) - monthIndex(input.first) + 1;
	const months = new Set(input.days.map((d) => d.slice(0, 7))).size;

	const aim = acc >= AIM_ACC ? "P" : "R";
	const range = total > 0 && played / total >= RANGE_SHARE ? "E" : "F";
	const grip = combos / good.length >= GRIP_SHARE ? "S" : "W";
	const pace = months / monthsTotal >= PACE_SHARE ? "M" : "B";
	const start = input.rks?.start ?? null;
	const end = input.rks?.end ?? null;
	const gain = start !== null && end !== null ? end - start : null;
	const family: PgtiFamily =
		aim === "P"
			? range === "E"
				? "collector"
				: "crafter"
			: range === "E"
				? "adventurer"
				: "challenger";
	const style: PgtiStyle =
		grip === "S"
			? pace === "M"
				? "clockwork"
				: "ambush"
			: pace === "M"
				? "grinder"
				: "fireworks";

	return {
		code: `${aim}${range}${grip}${pace}`,
		aim: { letter: aim, acc },
		range: { letter: range, played, total },
		grip: { letter: grip, fc: combos, total: good.length },
		pace: { letter: pace, months, total: monthsTotal },
		drive:
			gain === null ? null : { letter: gain >= DRIVE_GAIN ? "G" : "K", gain },
		family,
		style,
	};
}
