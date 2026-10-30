import { type ChartStatus, chartStatus } from "@/lib/chart-status";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import type { Save } from "@/phi/lib/save";
import { openHistory, type SaveHistory } from "@/phi/lib/save-history";
import { type TargetChart, targetsFor } from "@/phi/lib/targets";
import type { ChartSummary } from "./charts";
import { simBaseOf } from "./simulation";

export type SongNames = Record<string, string>;

export type TargetRow = {
	id: string;
	rank: LevelKind;
	c: number;
	acc: number | null;
	need: number;
	ap: boolean;
	gain: number;
};

export type TargetsView = {
	rks: number;
	goal: number;
	rows: TargetRow[];
	stuck: number;
	songs: SongNames;
};

export type ProgressRow = [
	id: string,
	rank: LevelKind,
	constant: number,
	status: ChartStatus,
	acc: number,
	score: number,
];

export type ProgressView = { rows: ProgressRow[]; songs: SongNames };

export type TrendPoint = [t: number, rks: number];
export type TrendEvent = {
	id: string;
	rank: string;
	t: number;
	before: { acc: number; score: number } | null;
	after: { acc: number; score: number; fc: boolean };
};
export type TrendView = {
	points: TrendPoint[];
	events: TrendEvent[];
	songs: SongNames;
};

const EVENTS_MAX = 300;

function catalogCharts(list: readonly ChartSummary[]): TargetChart[] {
	const out: TargetChart[] = [];
	for (const song of list) {
		for (const rank of LEVEL) {
			const cell = song.charts[rank];
			if (cell && cell[0] > 0)
				out.push({ id: song.id, rank, difficulty: cell[0] });
		}
	}
	return out;
}

function namesFor(
	list: readonly ChartSummary[],
	ids: Iterable<string>,
): SongNames {
	const byId = new Map(list.map((s) => [s.id, s.song] as const));
	const out: SongNames = {};
	for (const id of ids) out[id] = byId.get(id) ?? id.replace(/\.0$/, "");
	return out;
}

export function targetsView(
	save: Save,
	list: readonly ChartSummary[],
): TargetsView {
	const { base } = simBaseOf({ save, token: "" });
	const set = targetsFor(base.records, catalogCharts(list));
	const rows: TargetRow[] = [];
	let stuck = 0;
	for (const t of set.targets) {
		if (t.need == null) {
			if (t.acc != null) stuck++;
			continue;
		}
		rows.push({
			id: t.id,
			rank: t.rank,
			c: t.difficulty,
			acc: t.acc,
			need: Number(t.need.toFixed(4)),
			ap: t.viaAp,
			gain: Number(t.apGain.toFixed(4)),
		});
	}
	return {
		rks: set.rks,
		goal: set.goal,
		rows,
		stuck,
		songs: namesFor(
			list,
			rows.map((r) => r.id),
		),
	};
}

export function progressView(
	save: Save,
	list: readonly ChartSummary[],
): ProgressView {
	const rows: ProgressRow[] = [];
	for (const song of list) {
		const records = save.gameRecord[song.id];
		LEVEL.forEach((rank, i) => {
			const cell = song.charts[rank];
			if (!cell || !(cell[0] > 0)) return;
			const rec = records?.[i];
			rows.push([
				song.id,
				rank,
				cell[0],
				chartStatus(rec),
				rec ? Number(rec.acc.toFixed(4)) : 0,
				rec?.score ?? 0,
			]);
		});
	}
	return {
		rows,
		songs: namesFor(list, new Set(rows.map((r) => r[0]))),
	};
}

export function trendPoints(
	history: Pick<SaveHistory, "rks">,
	now?: { t: number; rks: number },
): TrendPoint[] {
	const points: TrendPoint[] = [];
	for (const item of history.rks) {
		const t = new Date(item.date).getTime();
		if (Number.isFinite(t) && Number.isFinite(item.value)) {
			points.push([t, item.value]);
		}
	}
	if (now && Number.isFinite(now.t) && !points.some(([t]) => t === now.t)) {
		points.push([now.t, now.rks]);
	}
	points.sort((a, b) => a[0] - b[0]);
	return points;
}

export function trendEvents(
	history: Pick<SaveHistory, "scoreHistory">,
	max = EVENTS_MAX,
): TrendEvent[] {
	const events: TrendEvent[] = [];
	for (const [id, levels] of Object.entries(history.scoreHistory)) {
		for (const [rank, list] of Object.entries(levels ?? {})) {
			if (!list?.length) continue;
			const opened = list.map(openHistory).reverse();
			opened.forEach((cur, i) => {
				const t = cur.date.getTime();
				if (!Number.isFinite(t)) return;
				const prev = i > 0 ? opened[i - 1] : undefined;
				events.push({
					id,
					rank,
					t,
					before: prev ? { acc: prev.acc, score: prev.score } : null,
					after: { acc: cur.acc, score: cur.score, fc: cur.fc },
				});
			});
		}
	}
	events.sort((a, b) => b.t - a.t || (a.id < b.id ? -1 : 1));
	return events.slice(0, max);
}

export function trendView(
	save: Save,
	history: Pick<SaveHistory, "rks" | "scoreHistory">,
	list: readonly ChartSummary[],
): TrendView {
	const modified = save.saveInfo.modifiedAt?.iso;
	const rks = save.saveInfo.summary?.rankingScore;
	const points = trendPoints(
		history,
		modified && typeof rks === "number"
			? { t: new Date(modified).getTime(), rks }
			: undefined,
	);
	const events = trendEvents(history);
	return {
		points,
		events,
		songs: namesFor(list, new Set(events.map((e) => e.id))),
	};
}
