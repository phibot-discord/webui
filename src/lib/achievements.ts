import type { ChartStatus } from "./chart-status";

export const ACHIEVEMENT_IDS = [
	"ap",
	"fc",
	"clear",
	"songs",
	"rks",
	"topShelf",
	"highAp",
	"highFc",
	"fullSet",
	"allAp",
	"chapters",
	"chapterFc",
	"nines",
	"floor",
	"challengeColor",
	"challengeSum",
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export type AchievementChart = {
	id: string;
	c: number;
	status: ChartStatus;
	acc: number;
	chapter: string;
};

export type AchievementInput = {
	charts: readonly AchievementChart[];
	rks: number | null;
	challenge: number;
	best: readonly number[];
};

export type Achievement = {
	id: AchievementId;
	have: number;
	steps: number[];
	done: number;
	next: number | null;
};

const EPS = 1e-9;
const BEST_SLOTS = 27;
const TOP_SHELF = 15;
const NINES = 99;
const HIGH_STEPS = [12, 13, 14, 15, 15.5, 16, 16.5];

const cleared = (s: ChartStatus) => s === "ap" || s === "fc" || s === "clear";
const combo = (s: ChartStatus) => s === "ap" || s === "fc";

function upTo(fixed: readonly number[], total: number): number[] {
	return total > 0 ? [...fixed.filter((n) => n < total), total] : [...fixed];
}

function groupsWhere(
	charts: readonly AchievementChart[],
	keyOf: (c: AchievementChart) => string,
	ok: (s: ChartStatus) => boolean,
): { all: number; done: number } {
	const groups = new Map<string, boolean>();
	for (const chart of charts) {
		const key = keyOf(chart);
		if (!key) continue;
		groups.set(key, (groups.get(key) ?? true) && ok(chart.status));
	}
	let done = 0;
	for (const good of groups.values()) if (good) done++;
	return { all: groups.size, done };
}

export function achievementsOf(input: AchievementInput): Achievement[] {
	const { charts } = input;
	const aps = charts.filter((c) => c.status === "ap");
	const fcs = charts.filter((c) => combo(c.status));
	const songs = new Set(
		charts.filter((c) => c.status !== "none").map((c) => c.id),
	);
	const allSongs = new Set(charts.map((c) => c.id)).size;
	const bySong = (c: AchievementChart) => c.id;
	const byChapter = (c: AchievementChart) => c.chapter;
	const chapters = groupsWhere(charts, byChapter, cleared);
	const values: Record<AchievementId, [have: number, steps: number[]]> = {
		ap: [aps.length, [1, 10, 25, 50, 100, 200, 300, 500]],
		fc: [fcs.length, [1, 25, 50, 100, 200, 400, 600, 800]],
		clear: [
			charts.filter((c) => cleared(c.status)).length,
			upTo([50, 100, 250, 500, 750, 1000], charts.length),
		],
		songs: [songs.size, upTo([25, 50, 100, 200, 300], allSongs)],
		rks: [input.rks ?? 0, [10, 12, 13, 14, 15, 15.5, 16, 16.5, 17]],
		topShelf: [aps.filter((c) => c.c >= TOP_SHELF).length, [1, 5, 10, 25, 50]],
		highAp: [Math.max(0, ...aps.map((c) => c.c)), HIGH_STEPS],
		highFc: [Math.max(0, ...fcs.map((c) => c.c)), HIGH_STEPS],
		fullSet: [groupsWhere(charts, bySong, combo).done, [1, 10, 25, 50, 100]],
		allAp: [
			groupsWhere(charts, bySong, (s) => s === "ap").done,
			[1, 5, 10, 25],
		],
		chapters: [chapters.done, upTo([1, 3, 5, 8], chapters.all)],
		chapterFc: [groupsWhere(charts, byChapter, combo).done, [1, 2, 3, 5]],
		nines: [
			charts.filter((c) => c.status !== "none" && c.acc >= NINES).length,
			[10, 50, 100, 200, 400],
		],
		floor: [
			input.best.length >= BEST_SLOTS
				? Math.min(...input.best.slice(0, BEST_SLOTS))
				: 0,
			[95, 97, 98, 99, 99.5],
		],
		challengeColor: [Math.floor(input.challenge / 100), [1, 2, 3, 4, 5]],
		challengeSum: [input.challenge % 100, [30, 36, 39, 42, 45, 48]],
	};
	return ACHIEVEMENT_IDS.map((id) => {
		const [have, steps] = values[id];
		const done = steps.filter((n) => have >= n - EPS).length;
		return { id, have, steps, done, next: steps[done] ?? null };
	});
}
