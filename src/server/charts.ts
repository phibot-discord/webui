import { createHash } from "node:crypto";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import { type AliasIndex, ensureAliases } from "./aliases";

export type ChartCell = [number, number | null];
export type ChartSummary = {
	id: string;
	song: string;
	composer: string;
	aliases?: string[];
	charts: Partial<Record<LevelKind, ChartCell>>;
};

export type ChartSnapshot = {
	rev: string;
	list: ChartSummary[];
	json: string;
	etag: string;
};

let snapshot: ChartSnapshot | undefined;

function build(aliases: AliasIndex["byId"]): ChartSummary[] {
	const byId = new Map<string, ChartSummary>();
	for (const song of [
		...Object.values(getInfo.ori_info),
		...Object.values(getInfo.sp_info),
	]) {
		const charts: ChartSummary["charts"] = {};
		let any = false;
		for (const level of LEVEL) {
			const chart = song.chart?.[level];
			const difficulty = Number(chart?.difficulty);
			if (!chart || !Number.isFinite(difficulty) || difficulty <= 0) continue;
			const notes = Number(chart.combo);
			charts[level] = [
				difficulty,
				Number.isInteger(notes) && notes > 0 ? notes : null,
			];
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
	const hash = createHash("sha1").update(json).digest("hex").slice(0, 16);
	return { rev, list, json, etag: `"charts-${hash}"` };
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

export function chartCell(id: string, rank: string): ChartCell | undefined {
	const song =
		getInfo.ori_info[id] ??
		getInfo.sp_info[id] ??
		getInfo.ori_info[`${id}.0`] ??
		getInfo.sp_info[`${id}.0`];
	const chart = song?.chart?.[rank];
	const difficulty = Number(chart?.difficulty);
	if (!chart || !Number.isFinite(difficulty) || difficulty <= 0) return;
	const notes = Number(chart.combo);
	return [difficulty, Number.isInteger(notes) && notes > 0 ? notes : null];
}
