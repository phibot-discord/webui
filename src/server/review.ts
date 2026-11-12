import type { Locale } from "@/i18n/config";
import { formatDay } from "@/i18n/datetime";
import { shanghaiDay } from "@/lib/past-self";
import type { Pgti } from "@/lib/pgti";
import type { ReplayInput, ReplayMark } from "@/lib/review-deck";
import {
	FIRST_REVIEW_YEAR,
	REVIEW_OPENS,
	REVIEW_YEAR,
	type ReviewPhase,
	reviewWindow,
	reviewYear,
} from "@/lib/review-window";
import {
	type Wrapped,
	type WrappedTile,
	wrappedOf,
	wrappedTimelineOf,
} from "@/lib/wrapped";
import type { SaveHistory } from "@/phi/lib/save-history";
import type { ChartSummary } from "./charts";
import { recapPgti } from "./recap-type";
import { SNAP_W, wrappedSnapHeight } from "./render/snapshot";
import { catalogLookup, wrappedText } from "./snapshot";

export type ReviewView =
	| { state: "soon"; opens: string }
	| {
			state: "ok" | "none" | "manual";
			year: number;
			years: number[];
			soFar: boolean;
			range: string;
			tiles: WrappedTile[];
			message: string;
			note: string;
			size: [number, number];
			replay: ReplayInput | null;
			pgti: Pgti | null;
	  };

type ReviewInput =
	| { phase: "soon"; locale: Locale }
	| {
			phase: Exclude<ReviewPhase, "soon">;
			locale: Locale;
			requested: string | null;
			manual: boolean;
			history: Pick<SaveHistory, "rks" | "scoreHistory">;
			list: readonly ChartSummary[];
			jacketOf?: (id: string) => string | undefined;
	  };

export function reviewPhaseNow(): ReviewPhase {
	return reviewWindow(Date.now(), {
		PHI_REVIEW_EARLY: process.env.PHI_REVIEW_EARLY,
		VERCEL_ENV: process.env.VERCEL_ENV,
		NODE_ENV: process.env.NODE_ENV,
	});
}

function replayMarks(
	w: Wrapped,
	tiles: readonly WrappedTile[],
	nameOf: (id: string) => string,
	jacketOf: ((id: string) => string | undefined) | undefined,
): ReplayMark[] {
	const marks: ReplayMark[] = [];
	const jacket = (id: string) => {
		const link = jacketOf?.(id);
		return typeof link === "string" ? { jacket: link } : {};
	};
	const jumpTile = tiles[6]!;
	const apTile = tiles[4]!;
	const fcTile = tiles[5]!;
	const stepTile = tiles[7]!;
	if (w.jump)
		marks.push({
			kind: "jump",
			day: w.jump.day,
			label: jumpTile.label,
			value: jumpTile.value,
			sub: jumpTile.sub,
			big: `${w.jump.gain >= 0 ? "+" : ""}${w.jump.gain.toFixed(4)}`,
		});
	const { top: apTop } = w.ap;
	if (apTop)
		marks.push({
			kind: "ap",
			day: shanghaiDay(apTop.t),
			label: apTile.label,
			value: nameOf(apTop.id),
			sub: `${apTop.rank} ${apTop.c.toFixed(1)}`,
			big: String(w.ap.count),
			...jacket(apTop.id),
		});
	const { top: fcTop } = w.fc;
	if (fcTop)
		marks.push({
			kind: "fc",
			day: shanghaiDay(fcTop.t),
			label: fcTile.label,
			value: nameOf(fcTop.id),
			sub: `${fcTop.rank} ${fcTop.c.toFixed(1)}`,
			big: String(w.fc.count),
			...jacket(fcTop.id),
		});
	const step = w.mostImproved;
	if (step)
		marks.push({
			kind: "step",
			day: shanghaiDay(step.t),
			label: stepTile.label,
			value: stepTile.value,
			sub: stepTile.sub,
			big: `${step.acc.toFixed(2)}%`,
			acc: { before: step.before?.acc ?? null, after: step.acc },
			...jacket(step.id),
		});
	return marks;
}

export function reviewView(input: ReviewInput): ReviewView {
	if (input.phase === "soon")
		return { state: "soon", opens: formatDay(REVIEW_OPENS, input.locale) };
	const { constantOf, nameOf } = catalogLookup(input.list);
	const byYear = new Map<number, Wrapped>();
	for (let year = REVIEW_YEAR; year >= FIRST_REVIEW_YEAR; year--) {
		const w = wrappedOf({
			year,
			rks: input.history.rks,
			history: input.history.scoreHistory,
			constantOf,
		});
		if (year === REVIEW_YEAR || w.status === "ok") byYear.set(year, w);
	}
	const w = byYear.get(reviewYear(input.requested)) ?? byYear.get(REVIEW_YEAR)!;
	const text = wrappedText(w, nameOf, input.locale, input.manual);
	const timeline = input.manual
		? null
		: wrappedTimelineOf({
				year: w.year,
				rks: input.history.rks,
				history: input.history.scoreHistory,
				constantOf,
			});
	const replay: ReplayInput | null = timeline
		? {
				...timeline,
				marks: replayMarks(w, text.tiles, nameOf, input.jacketOf),
			}
		: null;
	const pgti = recapPgti({
		timeline,
		history: input.history,
		list: input.list,
		constantOf,
		year: w.year,
	});
	return {
		state: input.manual ? "manual" : w.status,
		year: w.year,
		years: [...byYear.keys()],
		soFar: input.phase === "open" && w.year === REVIEW_YEAR,
		...text,
		size: [SNAP_W, wrappedSnapHeight(text, pgti !== null)],
		replay,
		pgti,
	};
}
