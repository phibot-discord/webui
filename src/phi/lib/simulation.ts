/** "Song simulation": the RKS and P3 + B27 list if some charts had a better accuracy; pure */

import type { LevelKind } from "./const";
import {
	chartRks,
	manualRecordKey,
	parseAcc,
	roundAcc,
	validScore,
} from "./manual-score";

export const SIM_MAX_EDITS = 200;
const PHI_SLOTS = 3;
const BEST_SLOTS = 27;

/** A real record of the save the simulation is based on; `score` is missing from snapshots made before it was kept */
export type SimBaseRecord = readonly [
	id: string,
	rank: LevelKind,
	acc: number,
	difficulty: number,
	score?: number,
];

/** The save as it was when the simulation was started or last synced */
export type SimBase = {
	rev: string;
	lastSynced?: string;
	records: SimBaseRecord[];
};

/** `acc` and `score` stay the typed text so a half-typed number survives a reload */
export type SimEdit = {
	id: string;
	rank: LevelKind;
	acc: string;
	score?: string;
	difficulty?: number;
	song?: string;
};

type Entry = {
	key: string;
	id: string;
	rank: LevelKind;
	acc: number;
	difficulty: number;
	rks: number;
};

export type SimSlot = Entry & {
	slot: string;
	was?: string;
};

export type SimChartStatus = "invalid" | "unknown" | "no_gain" | "better";

export type SimChart = {
	key: string;
	edit: SimEdit;
	difficulty?: number;
	realAcc?: number;
	realRks?: number;
	simAcc?: number;
	newRks?: number;
	status: SimChartStatus;
};

export type SimResult = {
	before: number;
	after: number;
	delta: number;
	current: { phi: SimSlot[]; best: SimSlot[] };
	phi: SimSlot[];
	best: SimSlot[];
	left: SimSlot[];
	charts: SimChart[];
};

function entryOf(
	id: string,
	rank: LevelKind,
	acc: number,
	difficulty: number,
): Entry {
	return {
		key: manualRecordKey(id, rank),
		id,
		rank,
		acc,
		difficulty,
		rks: chartRks(acc, difficulty),
	};
}

/** In-game rule: the three best AP charts plus the best 27 of all, over 30 */
function slotsOf(entries: Iterable<Entry>) {
	const sorted = [...entries].sort(
		(a, b) => b.rks - a.rks || (a.key < b.key ? -1 : 1),
	);
	const phi = sorted.filter((e) => e.acc >= 100).slice(0, PHI_SLOTS);
	const best = sorted.slice(0, BEST_SLOTS);
	return { phi, best };
}

function rksOf(phi: Entry[], best: Entry[]) {
	let sum = 0;
	for (const e of phi) sum += e.rks;
	for (const e of best) sum += e.rks;
	return sum / (PHI_SLOTS + BEST_SLOTS);
}

function labelled(list: Entry[], prefix: string): SimSlot[] {
	return list.map((e, i) => ({ ...e, slot: `${prefix}${i + 1}` }));
}

/** `difficultyOf` is the catalog, for charts the save has no record of yet */
export function simulate(
	base: readonly SimBaseRecord[],
	edits: readonly SimEdit[],
	difficultyOf?: (id: string, rank: LevelKind) => number | undefined,
): SimResult {
	const real = new Map<string, Entry>();
	for (const [id, rank, acc, difficulty] of base) {
		const e = entryOf(id, rank, acc, difficulty);
		real.set(e.key, e);
	}

	const charts: SimChart[] = [];
	const merged = new Map(real);
	for (const edit of edits) {
		const key = manualRecordKey(edit.id, edit.rank);
		const had = real.get(key);
		const difficulty =
			had?.difficulty ?? difficultyOf?.(edit.id, edit.rank) ?? edit.difficulty;
		const simAcc = parseAcc(edit.acc);
		const chart: SimChart = {
			key,
			edit,
			difficulty,
			realAcc: had?.acc,
			realRks: had?.rks,
			simAcc,
			status: "better",
		};
		charts.push(chart);
		if (simAcc == null) {
			chart.status = "invalid";
			continue;
		}
		if (difficulty == null || !(difficulty > 0)) {
			chart.status = "unknown";
			continue;
		}
		chart.newRks = chartRks(simAcc, difficulty);
		if (had && simAcc <= had.acc) {
			chart.status = "no_gain";
			continue;
		}
		merged.set(key, entryOf(edit.id, edit.rank, simAcc, difficulty));
	}

	const was = slotsOf(real.values());
	const now = slotsOf(merged.values());
	const wasPhi = labelled(was.phi, "P");
	const wasBest = labelled(was.best, "B");
	const slotIn = (list: SimSlot[]) =>
		new Map(list.map((s) => [s.key, s.slot] as const));
	const wasPhiAt = slotIn(wasPhi);
	const wasBestAt = slotIn(wasBest);
	const phi = labelled(now.phi, "P").map((s) => ({
		...s,
		was: wasPhiAt.get(s.key),
	}));
	const best = labelled(now.best, "B").map((s) => ({
		...s,
		was: wasBestAt.get(s.key),
	}));
	const nowPhi = new Set(phi.map((s) => s.key));
	const nowBest = new Set(best.map((s) => s.key));
	const left = [
		...wasPhi.filter((s) => !nowPhi.has(s.key)),
		...wasBest.filter((s) => !nowBest.has(s.key)),
	];

	const before = rksOf(was.phi, was.best);
	const after = rksOf(now.phi, now.best);
	return {
		before,
		after,
		delta: after - before,
		current: { phi: wasPhi, best: wasBest },
		phi,
		best,
		left,
		charts,
	};
}

/** The accuracy a score means, assuming a full combo: the lowest it can be, so RKS is never overstated */
export function accFromScore(score: number): number {
	if (score >= 1_000_000) return 100;
	return Math.min(100, Math.max(0, (score - 100_000) / 9000));
}

/** The score of a full combo at that accuracy: the inverse of `accFromScore` */
export function scoreFromAcc(acc: number): number {
	if (acc >= 100) return 1_000_000;
	return Math.round(Math.max(0, acc) * 9000 + 100_000);
}

export function sanitizeAcc(raw: string): string {
	return raw.replace(/[^\d.]/g, "").slice(0, 10);
}

export function sanitizeScore(raw: string): string {
	return raw.replace(/\D/g, "").slice(0, 7);
}

/** The accuracy and its score move together: the score is the full-combo reading of the accuracy */
export function withAcc(edit: SimEdit, raw: string): SimEdit {
	const acc = sanitizeAcc(raw);
	const n = parseAcc(acc);
	return {
		...edit,
		acc,
		score: n == null ? undefined : String(scoreFromAcc(n)),
	};
}

/** Typing the score sets the accuracy from it; a blank score leaves the accuracy as it was */
export function withScore(edit: SimEdit, raw: string): SimEdit {
	const score = sanitizeScore(raw);
	if (score === "") return { ...edit, score: undefined };
	const n = Number(score);
	if (!validScore(n)) return { ...edit, score };
	return { ...edit, score, acc: String(roundAcc(accFromScore(n))) };
}

export function withAp(edit: SimEdit, ap: boolean): SimEdit {
	return ap
		? { ...edit, acc: "100", score: "1000000" }
		: { ...edit, acc: "", score: undefined };
}

/** Nothing typed: the edit simulates nothing */
export function isBlank(edit: SimEdit): boolean {
	return edit.acc === "" && !edit.score;
}
