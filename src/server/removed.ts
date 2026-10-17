import { REMOVED_PREFIX } from "@/lib/assets";
import { isExtraPackLevel, isPackLevel } from "@/lib/chart-catalog";
import { text } from "@/lib/parse";
import { isPhiraLevel, phiraPackFile, phiraPackKey } from "@/phi/lib/phira";
import type { AliasIndex } from "./aliases";
import type { ChartCell, ChartSummary, RemovedCell, SideRows } from "./charts";
import { jsonLoader } from "./manifest";
import {
	chartBase,
	chartRows,
	findSong,
	sideSummary,
	songIds,
	songRows,
} from "./side-tree";

// Songs and charts the game no longer ships, under `removed/` in the normal layout (scripts/publish-removed.ts)
const REMOVED_MANIFEST_KEY = `${REMOVED_PREFIX}/index.json`;

export type RemovedChart = {
	label: string;
	charter: string;
	notes: number | null;
	from: string;
};

export type RemovedSong = {
	id: string;
	stem: string;
	song: string;
	composer: string;
	illustrator: string;
	gone: boolean;
	jacket: boolean;
	charts: Record<string, RemovedChart>;
};

const manifest = jsonLoader(
	REMOVED_MANIFEST_KEY,
	parseRemovedManifest,
	[] as RemovedSong[],
);

/** One bad song or chart is skipped, not the whole manifest. Ids get the catalog's `.0` */
export function parseRemovedManifest(raw: unknown): RemovedSong[] {
	const out: RemovedSong[] = [];
	for (const r of songRows(raw)) {
		const id = text(r.id).trim();
		const song = text(r.song).trim();
		const charts: RemovedSong["charts"] = {};
		for (const [level, c] of chartRows(r)) {
			if (isPackLevel(level)) {
				charts[level] = { ...chartBase(c), from: text(c.from) };
			}
		}
		if (!id || !song || !Object.keys(charts).length) continue;
		out.push({
			...songIds(id, r.stem),
			song,
			composer: text(r.composer),
			illustrator: text(r.illustrator),
			gone: r.gone === true,
			jacket: r.jacket === true,
			charts,
		});
	}
	return out;
}

/** The manifest's songs, from memory for 5 min, like the 4/1 list */
export function loadRemoved(): Promise<RemovedSong[]> {
	return manifest.load();
}

async function removedSong(id: string): Promise<RemovedSong | undefined> {
	return findSong(await loadRemoved(), id);
}

/** Where the Phira pack for `id`'s `level` lives, when the manifest lists that chart */
export async function removedPack(
	id: string,
	level: string,
): Promise<{ filename: string; key: string } | undefined> {
	const song = await removedSong(id);
	if (!song?.charts[level]) return undefined;
	return {
		filename: phiraPackFile(song.id, level),
		key: phiraPackKey(song.stem, level, REMOVED_PREFIX),
	};
}

/** The removed levels the song list has no cell for (Legacy, BND and the like), for the Phira page's extra packs */
export async function removedExtraLevels(id: string): Promise<string[]> {
	const song = await removedSong(id);
	return song ? Object.keys(song.charts).filter(isExtraPackLevel) : [];
}

/** Catalog rows for removed levels: difficulty 0, findable and downloadable but not scored */
export function removedSummaries(
	songs: readonly RemovedSong[],
	aliases?: AliasIndex["byId"],
): ChartSummary[] {
	return songs.map((s) => {
		const charts: ChartSummary["charts"] = {};
		const removed: Record<string, RemovedCell> = {};
		for (const [level, chart] of Object.entries(s.charts)) {
			removed[level] = {
				from: chart.from,
				label: chart.label,
				notes: chart.notes,
			};
			if (!isPhiraLevel(level)) continue;
			const cell: ChartCell = [0, chart.notes, chart.label];
			charts[level] = cell;
		}
		return {
			...sideSummary(s, charts, aliases),
			...(s.illustrator ? { illustrator: s.illustrator } : {}),
			removed,
			...(s.gone ? { gone: true as const } : {}),
		};
	});
}

export function removedRows(songs: readonly RemovedSong[]): SideRows {
	return { songs, rows: (aliases) => removedSummaries(songs, aliases) };
}
