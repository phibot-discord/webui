import { type Locale, localeTag } from "@/i18n/config";
import { catalogs } from "@/i18n/server";
import { displayPlayerId } from "@/lib/player-display";
import {
	cellKey,
	type GridCell,
	metricCount,
	progressGrid,
} from "@/lib/progress-grid";
import { SITE_ORIGIN } from "@/lib/site";
import { fill } from "@/phi/lib/card-i18n";
import { LEVEL } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import type { Save } from "@/phi/lib/save";
import { shownGoal, sortTargets, targetOfRow } from "@/phi/lib/targets";
import type { ChartSummary } from "./charts";
import { hydrateIlls } from "./ill";
import {
	type ProgressSnap,
	progressSnapHeight,
	SNAP_PROGRESS,
	SNAP_TARGETS,
	type SnapCell,
	type TargetsSnap,
	targetsSnapHeight,
} from "./render/snapshot";
import { progressView, targetsView } from "./save-views";
import { exists } from "./vfs";

const SNAP_VIEWS = ["progress", "targets"] as const;
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
			need: t.viaAp ? "AP" : `${t.need.toFixed(2)}%`,
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
