import { type Locale, localeTag } from "@/i18n/config";
import { formatDay } from "@/i18n/datetime";
import { catalogs } from "@/i18n/server";
import type { PgtiCode } from "@/i18n/tools-messages";
import { shanghaiDay } from "@/lib/past-self";
import { displayPlayerId } from "@/lib/player-display";
import {
	cellKey,
	type GridCell,
	metricCount,
	progressGrid,
} from "@/lib/progress-grid";
import { SITE_ORIGIN } from "@/lib/site";
import {
	type Wrapped,
	wrappedOf,
	wrappedTiles,
	wrappedTimelineOf,
} from "@/lib/wrapped";
import { fill } from "@/phi/lib/card-i18n";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import type { Save } from "@/phi/lib/save";
import type { SaveHistory } from "@/phi/lib/save-history";
import {
	roundUp,
	shownGoal,
	sortTargets,
	targetOfRow,
} from "@/phi/lib/targets";
import type { ChartSummary } from "./charts";
import { hydrateIlls } from "./ill";
import { recapPgti } from "./recap-type";
import {
	type ProgressSnap,
	progressSnapHeight,
	SNAP_PROGRESS,
	SNAP_TARGETS,
	SNAP_WRAPPED,
	type SnapCell,
	type TargetsSnap,
	targetsSnapHeight,
	type WrappedSnap,
	wrappedSnapHeight,
} from "./render/snapshot";
import { progressView, targetsView } from "./save-views";
import { exists } from "./vfs";

const SNAP_VIEWS = ["progress", "targets", "review"] as const;
export type SnapView = (typeof SNAP_VIEWS)[number];

const TARGETS_SHOWN = 10;
const ACCENT = "#4fc3f7";

export function isSnapView(v: string | null): v is SnapView {
	return (SNAP_VIEWS as readonly (string | null)[]).includes(v);
}

function headOf(save: Save, locale: Locale, title: string) {
	const m = catalogs[locale];
	const rks = save.saveInfo.summary?.rankingScore;
	const day = new Date().toLocaleDateString(localeTag(locale), {
		timeZone: "Asia/Shanghai",
		dateStyle: "medium",
	});
	return {
		brand: m.brand,
		host: new URL(SITE_ORIGIN).host,
		title,
		player: displayPlayerId(save.saveInfo.PlayerId),
		meta: [typeof rks === "number" ? `RKS ${rks.toFixed(4)}` : "", day]
			.filter(Boolean)
			.join(" · "),
		accent: ACCENT,
		lang: localeTag(locale),
	};
}

function snapCell(cell: GridCell<unknown> | undefined): SnapCell | null {
	return cell
		? {
				clear: metricCount(cell, "clear"),
				fc: metricCount(cell, "fc"),
				ap: metricCount(cell, "ap"),
				total: cell.rows.length,
			}
		: null;
}

export function progressSnap(
	save: Save,
	list: readonly ChartSummary[],
	locale: Locale,
): { id: string; data: ProgressSnap; height: number } {
	const m = catalogs[locale];
	const view = progressView(save, list);
	const levels = LEVEL.filter((rank) => view.rows.some((r) => r[1] === rank));
	const grid = progressGrid(view.rows);
	const rows: ProgressSnap["rows"] = grid.buckets.map((b) => ({
		bucket: String(b),
		cells: levels.map((rank) => snapCell(grid.cells.get(cellKey(rank, b)))),
	}));
	const data: ProgressSnap = {
		...headOf(save, locale, m.progress.title),
		levels: [...levels],
		rows,
		totals: levels.map((rank) => snapCell(grid.totals.get(rank))),
		labels: {
			constant: m.progress.constant,
			total: m.progress.total,
			fc: "FC",
			ap: "AP",
			legend: m.snapshot.progressLegend,
		},
	};
	return { id: SNAP_PROGRESS, data, height: progressSnapHeight(data) };
}

export async function targetsSnap(
	save: Save,
	list: readonly ChartSummary[],
	locale: Locale,
): Promise<{ id: string; data: TargetsSnap; height: number }> {
	const m = catalogs[locale];
	const view = targetsView(save, list);
	const top = sortTargets(
		view.rows.filter((r) => r.acc != null).map(targetOfRow),
		"gap",
	).slice(0, TARGETS_SHOWN);
	const paths = top.map((t) => getInfo.getill(t.id, "low") || "");
	const local = await hydrateIlls(paths.filter(Boolean)).catch(
		() => new Map<string, string>(),
	);
	const jacketOf = (p: string) => {
		const file = p ? (local.get(p) ?? p) : "";
		return file && exists(file) ? file : undefined;
	};
	const data: TargetsSnap = {
		...headOf(
			save,
			locale,
			`${m.targets.title} · ${fill(m.snapshot.goal, { goal: shownGoal(view.goal) })}`,
		),
		rows: top.map((t, i) => ({
			title: view.songs[t.id] ?? t.id.replace(/\.0$/, ""),
			rank: t.rank,
			c: t.difficulty.toFixed(1),
			acc: t.acc != null ? `${t.acc.toFixed(2)}%` : "—",
			need: t.viaAp ? "AP" : `${roundUp(t.need, 2).toFixed(2)}%`,
			...(jacketOf(paths[i] ?? "") ? { jacket: jacketOf(paths[i] ?? "") } : {}),
		})),
		labels: {
			song: m.targets.song,
			constant: m.targets.constant,
			acc: m.targets.acc,
			target: m.targets.target,
			empty: m.targets.none,
		},
	};
	return { id: SNAP_TARGETS, data, height: targetsSnapHeight(data) };
}

export function catalogLookup(list: readonly ChartSummary[]) {
	const byId = new Map(list.map((song) => [song.id, song] as const));
	return {
		constantOf: (id: string, rank: string) =>
			byId.get(id)?.charts[rank as LevelKind]?.[0],
		nameOf: (id: string) => byId.get(id)?.song ?? id.replace(/\.0$/, ""),
	};
}

export function wrappedText(
	w: Wrapped,
	nameOf: (id: string) => string,
	locale: Locale,
	manual: boolean,
): Pick<WrappedSnap, "range" | "tiles" | "message" | "note"> {
	const m = catalogs[locale];
	const first = formatDay(shanghaiDay(w.from + 1), locale);
	const last = w.last !== null ? shanghaiDay(w.last) : `${w.year}-12-31`;
	return {
		range: fill(m.wrapped.range, { from: first, to: formatDay(last, locale) }),
		tiles: wrappedTiles(w, m.wrapped, nameOf, locale),
		message: manual ? m.wrapped.manual : fill(m.wrapped.none, { year: w.year }),
		note: w.fromBaseline
			? `${fill(m.wrapped.baseline, { day: first })}${locale === "en" ? " " : ""}${m.wrapped.note}`
			: m.wrapped.note,
	};
}

export function wrappedSnap(
	save: Save,
	history: Pick<SaveHistory, "rks" | "scoreHistory">,
	list: readonly ChartSummary[],
	locale: Locale,
	year: number,
	manual: boolean,
): { id: string; data: WrappedSnap; height: number } {
	const m = catalogs[locale];
	const { constantOf, nameOf } = catalogLookup(list);
	const w = wrappedOf({
		year,
		rks: history.rks,
		history: history.scoreHistory,
		constantOf,
	});
	const pgti = recapPgti({
		timeline: manual
			? null
			: wrappedTimelineOf({
					year,
					rks: history.rks,
					history: history.scoreHistory,
					constantOf,
				}),
		history,
		list,
		constantOf,
		year,
	});
	const t = m.wrapped.pgti;
	const data: WrappedSnap = {
		...headOf(save, locale, fill(m.wrapped.title, { year })),
		...wrappedText(w, nameOf, locale, manual),
		...(pgti
			? {
					pgti: {
						label: "PGTI",
						letters: [...pgti.code],
						...(pgti.drive ? { suffix: pgti.drive.letter } : {}),
						name: t.names[pgti.code as PgtiCode],
						groups: `${t.families[pgti.family].name} · ${t.styles[pgti.style].name}`,
					},
				}
			: {}),
	};
	return {
		id: SNAP_WRAPPED,
		data,
		height: wrappedSnapHeight(data, data.pgti !== undefined),
	};
}
