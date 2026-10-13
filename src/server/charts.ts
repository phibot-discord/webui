import { createHash } from "node:crypto";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import { type AliasIndex, ensureAliases } from "./aliases";
import { foolsSummaries, loadFools } from "./fools";

/** [constant, notes, label?]: a label stands in for the constant on charts that have none (4/1 specials) */
export type ChartCell = [number, number | null, label?: string];
export type ChartSummary = {
	id: string;
	song: string;
	composer: string;
	aliases?: string[];
	charts: Partial<Record<LevelKind | "SP", ChartCell>>;
};

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

let withFools:
	| {
			base: string;
			extra: string;
			snapshot: Pick<ChartSnapshot, "json" | "etag">;
	  }
	| undefined;

/** The catalog plus the 4/1 specials, for the pages that download or browse (never for scoring) */
export async function chartCatalogWithFools(): Promise<
	Pick<ChartSnapshot, "json" | "etag"> & { aliases: AliasIndex }
> {
	const base = await chartCatalog();
	const known = new Set(base.list.map((song) => song.id));
	const extra = foolsSummaries(await loadFools()).filter(
		(song) => !known.has(song.id),
	);
	if (!extra.length) return base;
	const extraJson = JSON.stringify(extra);
	if (withFools?.base !== base.etag || withFools.extra !== extraJson) {
		const json = JSON.stringify([...base.list, ...extra]);
		withFools = {
			base: base.etag,
			extra: extraJson,
			snapshot: { json, etag: chartsEtag(json) },
		};
	}
	return { ...withFools.snapshot, aliases: base.aliases };
}

export function chartCell(id: string, rank: string): ChartCell | undefined {
	return cellOf(getInfo.raw(id)?.chart?.[rank]);
}
