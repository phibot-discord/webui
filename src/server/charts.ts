import { createHash } from "node:crypto";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import { PHIRA_LEVELS } from "@/phi/lib/phira";
import { type AliasIndex, ensureAliases } from "./aliases";
import { foolsRows, loadFools } from "./fools";
import { loadRemoved, removedRows } from "./removed";

/** [constant, notes, label?]: a label stands in for the constant on charts that have none (4/1 specials) */
export type ChartCell = [number, number | null, label?: string];
export type ChartSummary = {
	id: string;
	song: string;
	composer: string;
	illustrator?: string;
	aliases?: string[];
	charts: Partial<Record<LevelKind | "SP", ChartCell>>;
	removed?: Record<string, RemovedCell>;
	gone?: true;
	stem?: string;
};

export type RemovedCell = { from: string; label: string; notes: number | null };

export type ChartSnapshot = {
	rev: string;
	list: ChartSummary[];
	json: string;
	etag: string;
};

let snapshot: ChartSnapshot | undefined;

/** A chart with a positive constant as a catalog cell; undefined when the chart is missing or has no constant */
export function cellOf(
	chart: { difficulty?: unknown; combo?: unknown } | undefined,
): ChartCell | undefined {
	const difficulty = Number(chart?.difficulty);
	if (!chart || !Number.isFinite(difficulty) || difficulty <= 0) return;
	const notes = Number(chart.combo);
	return [difficulty, Number.isInteger(notes) && notes > 0 ? notes : null];
}

function chartsEtag(json: string): string {
	return `"charts-${createHash("sha1").update(json).digest("hex").slice(0, 16)}"`;
}

function build(aliases: AliasIndex["byId"]): ChartSummary[] {
	const byId = new Map<string, ChartSummary>();
	for (const song of [
		...Object.values(getInfo.ori_info),
		...Object.values(getInfo.sp_info),
	]) {
		const charts: ChartSummary["charts"] = {};
		let any = false;
		for (const level of LEVEL) {
			const cell = cellOf(song.chart?.[level]);
			if (!cell) continue;
			charts[level] = cell;
			any = true;
		}
		if (!any) continue;
		const seen = byId.get(song.id);
		if (seen) {
			// Introduction.0 is in both ori_info and sp_info: merge it so ids stay unique
			seen.composer ||= song.composer || "";
			for (const level of LEVEL) {
				const cell = charts[level];
				if (cell && !seen.charts[level]) seen.charts[level] = cell;
			}
			continue;
		}
		const nicks = aliases.get(song.id);
		byId.set(song.id, {
			id: song.id,
			song: song.song,
			composer: song.composer || "",
			...(nicks?.length ? { aliases: nicks.map((a) => a.text) } : {}),
			charts,
		});
	}
	return [...byId.values()];
}

export function buildChartSnapshot(
	rev: string,
	aliases: AliasIndex["byId"],
): ChartSnapshot {
	const list = build(aliases);
	const json = JSON.stringify(list);
	return { rev, list, json, etag: chartsEtag(json) };
}

export async function chartCatalog(): Promise<
	ChartSnapshot & { aliases: AliasIndex }
> {
	// Waits for the song catalog too; `aliases.rev` includes the revision getInfo holds
	const aliases = await ensureAliases();
	if (snapshot?.rev !== aliases.rev) {
		snapshot = buildChartSnapshot(aliases.rev, aliases.byId);
	}
	return { ...snapshot, aliases };
}

/** A side tree's catalog rows, built from its manifest's `songs` */
export type SideRows = {
	songs: readonly object[];
	rows: (aliases: AliasIndex["byId"]) => ChartSummary[];
};

let withSides:
	| {
			list: readonly ChartSummary[];
			aliases: AliasIndex["byId"];
			sides: readonly SideRows[];
			snapshot: Pick<ChartSnapshot, "json" | "etag">;
	  }
	| undefined;

/** `list` plus the side trees' rows; reused while `list`, `aliases` and every tree's songs are the same objects */
export function withSideTrees(
	list: readonly ChartSummary[],
	aliases: AliasIndex["byId"],
	sides: readonly SideRows[],
): Pick<ChartSnapshot, "json" | "etag"> {
	if (
		withSides?.list === list &&
		withSides.aliases === aliases &&
		withSides.sides.length === sides.length &&
		withSides.sides.every((side, i) => side.songs === sides[i]?.songs)
	) {
		return withSides.snapshot;
	}
	// Copies: `list` is the scoring catalog, which leaves out the illustrator only the files page shows
	const out = list.map((song) => {
		const by =
			getInfo.ori_info[song.id]?.illustrator ||
			getInfo.sp_info[song.id]?.illustrator;
		return by ? { ...song, illustrator: by } : song;
	});
	const at = new Map(out.map((song, i) => [song.id, i]));
	for (const extra of sides.flatMap((side) => side.rows(aliases))) {
		const i = at.get(extra.id) ?? out.length;
		const seen = out[i];
		if (!seen) {
			at.set(extra.id, i);
			out.push(extra);
			continue;
		}
		const add = PHIRA_LEVELS.filter(
			(level) => extra.charts[level] && !seen.charts[level],
		);
		if (!add.length && !extra.removed) continue;
		const charts = { ...seen.charts };
		for (const level of add) charts[level] = extra.charts[level];
		out[i] = {
			...seen,
			composer: seen.composer || extra.composer,
			charts,
			...(extra.removed
				? { removed: { ...seen.removed, ...extra.removed } }
				: {}),
			...(extra.gone ? { gone: true as const } : {}),
		};
	}
	const json = JSON.stringify(out);
	withSides = {
		list,
		aliases,
		sides,
		snapshot: { json, etag: chartsEtag(json) },
	};
	return withSides.snapshot;
}

/** The catalog plus the 4/1 specials and removed songs, for pages that download or browse, never scoring */
export async function chartCatalogWithFools(): Promise<
	Pick<ChartSnapshot, "json" | "etag"> & { aliases: AliasIndex }
> {
	const [base, songs, removed] = await Promise.all([
		chartCatalog(),
		loadFools(),
		loadRemoved(),
	]);
	return {
		...withSideTrees(base.list, base.aliases.byId, [
			foolsRows(songs),
			removedRows(removed),
		]),
		aliases: base.aliases,
	};
}

export function chartCell(id: string, rank: string): ChartCell | undefined {
	return cellOf(getInfo.raw(id)?.chart?.[rank]);
}
