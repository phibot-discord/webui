import type { TagVotes } from "@/phi/lib/chart-tag-votes";
import {
	type ProfileRecord,
	type ProfileTagRow,
	tagProfile,
} from "@/phi/lib/tag-profile";
import {
	dayEndMs,
	recordsAt,
	type ScoreHistoryMap,
	shanghaiDay,
} from "./past-self";

type TimelinePoint = {
	t: number;
	day: string;
	charts: number;
	played: number;
	rks: number;
	insufficient: boolean;
	now: boolean;
};

type TimelineCell = {
	net: number;
	rating: number;
	side: ProfileTagRow["side"];
	firm: boolean;
	hold: number;
};

type TimelineRow = { name: string; cells: (TimelineCell | null)[] };

export type ProfileTimeline = {
	points: TimelinePoint[];
	rows: TimelineRow[];
	coverage: number;
};

const POINTS = 6;
const ROWS = 12;
const DAY_MS = 86_400_000;

export function timelineDays(
	first: number,
	now: number,
	max = POINTS,
): string[] {
	const firstDay = shanghaiDay(first);
	const today = shanghaiDay(now);
	if (firstDay >= today) return [];
	const start = dayEndMs(firstDay) ?? first;
	const end = (dayEndMs(today) ?? now) - DAY_MS;
	if (end < start) return [firstDay];
	const steps = Math.max(1, max - 2);
	const out = new Set<string>();
	for (let i = 0; i <= steps; i++)
		out.add(shanghaiDay(start + ((end - start) * i) / steps));
	return [...out].sort();
}

function firstTime(history: ScoreHistoryMap): number | undefined {
	let first: number | undefined;
	for (const levels of Object.values(history)) {
		for (const rows of Object.values(levels ?? {})) {
			for (const row of rows ?? []) {
				const raw = row[2];
				const t = raw instanceof Date ? raw.getTime() : Date.parse(raw);
				if (Number.isFinite(t) && (first == null || t < first)) first = t;
			}
		}
	}
	return first;
}

function toProfile(rows: ReturnType<typeof recordsAt>): ProfileRecord[] {
	return rows.map(([id, level, acc, , , difficulty, rks]) => ({
		id,
		level,
		difficulty,
		rks,
		acc,
	}));
}

export function profileTimeline(
	history: ScoreHistoryMap,
	constantOf: (id: string, rank: string) => number | undefined,
	votes: TagVotes,
	live: { records: readonly ProfileRecord[]; t: number },
): ProfileTimeline | null {
	const first = firstTime(history);
	if (first == null) return null;
	const days = timelineDays(first, live.t);
	if (!days.length) return null;
	const nowRecords = recordsAt(history, live.t, constantOf);
	const coverage = live.records.length
		? Math.min(1, nowRecords.length / live.records.length)
		: 0;
	const snaps = [
		...days.map((day) => {
			const t = dayEndMs(day) ?? first;
			return {
				t,
				day,
				now: false,
				records: toProfile(recordsAt(history, t, constantOf)),
			};
		}),
		{
			t: live.t,
			day: shanghaiDay(live.t),
			now: true,
			records: [...live.records],
		},
	];
	const analyses = snaps.map((s) => tagProfile(s.records, votes));
	const points: TimelinePoint[] = snaps.map((s, i) => ({
		t: s.t,
		day: s.day,
		charts: analyses[i]!.chartCount,
		played: s.records.length,
		rks: analyses[i]!.rks,
		insufficient: analyses[i]!.insufficient,
		now: s.now,
	}));
	const byName = new Map<string, (TimelineCell | null)[]>();
	analyses.forEach((a, i) => {
		if (a.insufficient || a.basis === "aps") return;
		for (const tag of a.tags) {
			const cells = byName.get(tag.name) ?? new Array(snaps.length).fill(null);
			cells[i] = {
				net: tag.diff,
				rating: tag.rating,
				side: tag.side,
				firm: tag.firm,
				hold: tag.hold,
			};
			byName.set(tag.name, cells);
		}
	});
	const rows = [...byName]
		.filter(([, cells]) => cells.some((c) => c && c.side !== "even"))
		.map(([name, cells]) => ({
			name,
			cells,
			top: Math.max(
				...cells.map((c) => (c && c.side !== "even" ? Math.abs(c.net) : 0)),
			),
		}))
		.sort((a, b) => b.top - a.top || a.name.localeCompare(b.name))
		.slice(0, ROWS)
		.map(({ name, cells }) => ({ name, cells }));
	return { points, rows, coverage };
}
