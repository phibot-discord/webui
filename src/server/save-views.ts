import { type ChartStatus, chartStatus } from "@/lib/chart-status";
import { type SimilarIndex, suggestFrom } from "@/lib/similar";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import type { Save } from "@/phi/lib/save";
import { openHistory, type SaveHistory } from "@/phi/lib/save-history";
import {
	type TargetChart,
	type TargetRow,
	targetsFor,
} from "@/phi/lib/targets";
import type { ChartSummary } from "./charts";
import { simBaseOf } from "./simulation";

export type SongNames = Record<string, string>;

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

export type SuggestionRow = {
	id: string;
	rank: string;
	c: number;
	seed: { id: string; rank: string };
};

export type SuggestionsView = {
	basis: "ap" | "fc" | "best";
	rows: SuggestionRow[];
	songs: SongNames;
};

const SEEDS_MAX = 30;
const SEEDS_MIN = 5;
const SUGGEST_MAX = 10;

export function suggestionsView(
	save: Save,
	index: SimilarIndex,
	list: readonly ChartSummary[],
): SuggestionsView {
	const played = save.getRecord().filter((r) => r.score > 0);
	const byConstant = (rows: typeof played) =>
		[...rows].sort((a, b) => b.difficulty - a.difficulty).slice(0, SEEDS_MAX);
	const ap = played.filter((r) => r.score >= 1_000_000);
	const fc = played.filter((r) => r.fc || r.score >= 1_000_000);
	const basis: SuggestionsView["basis"] =
		ap.length >= SEEDS_MIN ? "ap" : fc.length >= SEEDS_MIN ? "fc" : "best";
	const seeds =
		basis === "ap"
			? byConstant(ap)
			: basis === "fc"
				? byConstant(fc)
				: [...played].sort((a, b) => b.rks - a.rks).slice(0, SEEDS_MAX);
	const done = new Set(played.map((r) => `${r.id}:${r.rank}`));
	const rows = suggestFrom(
		index,
		seeds.map((r) => ({ id: r.id, rank: r.rank })),
		(f) => !done.has(`${f.id}:${f.rank}`),
		SUGGEST_MAX,
	).map((s) => ({ id: s.id, rank: s.rank, c: s.c, seed: s.seed }));
	return {
		basis,
		rows,
		songs: namesFor(list, new Set(rows.flatMap((r) => [r.id, r.seed.id]))),
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
			const opened = list
				.map(openHistory)
				.filter((h) => Number.isFinite(h.date.getTime()))
				.sort((a, b) => a.date.getTime() - b.date.getTime());
			opened.forEach((cur, i) => {
				const prev = opened[i - 1];
				events.push({
					id,
					rank,
					t: cur.date.getTime(),
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
