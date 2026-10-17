import { FOOLS_PREFIX } from "@/lib/assets";
import { text } from "@/lib/parse";
import {
	isPhiraLevel,
	PHIRA_LEVELS,
	type PhiraLevel,
	phiraPackFile,
	phiraPackKey,
} from "@/phi/lib/phira";
import type { AliasIndex } from "./aliases";
import type { ChartCell, ChartSummary, SideRows } from "./charts";
import { jsonLoader } from "./manifest";
import {
	chartBase,
	chartRows,
	findSong,
	sideSummary,
	songIds,
	songRows,
} from "./side-tree";

// April Fools (4/1) specials the game shipped for a day, under `4-1/` in the normal layout (scripts/publish-fools.ts)
export const FOOLS_MANIFEST_KEY = `${FOOLS_PREFIX}/index.json`;

export type FoolsChart = {
	label: string;
	charter: string;
	notes: number | null;
};

export type FoolsSong = {
	id: string;
	stem: string;
	song: string;
	composer: string;
	jacket: boolean;
	charts: Partial<Record<PhiraLevel, FoolsChart>>;
};

const manifest = jsonLoader(
	FOOLS_MANIFEST_KEY,
	parseFoolsManifest,
	[] as FoolsSong[],
);

export function resetFoolsForTest() {
	manifest.reset();
}

/** One bad song or chart is skipped, not the whole manifest. Ids get the catalog's `.0` */
export function parseFoolsManifest(raw: unknown): FoolsSong[] {
	const out: FoolsSong[] = [];
	for (const r of songRows(raw)) {
		const id = text(r.id).trim();
		const song = text(r.song).trim();
		const charts: FoolsSong["charts"] = {};
		for (const [level, c] of chartRows(r)) {
			if (isPhiraLevel(level)) charts[level] = chartBase(c);
		}
		if (!id || !song || !Object.keys(charts).length) continue;
		out.push({
			...songIds(id, r.stem),
			song,
			composer: text(r.composer),
			jacket: r.jacket === true,
			charts,
		});
	}
	return out;
}

/** The manifest's songs, from memory for 5 min, then stale-while-revalidate; a failed read keeps the last list */
export function loadFools(): Promise<FoolsSong[]> {
	return manifest.load();
}

export function foolsPackKey(song: FoolsSong, level: PhiraLevel): string {
	return phiraPackKey(song.stem, level, FOOLS_PREFIX);
}

/** Where the Phira pack for `id`'s `level` lives, when the manifest lists that chart */
export async function foolsPack(
	id: string,
	level: PhiraLevel,
): Promise<{ filename: string; key: string } | undefined> {
	const song = findSong(await loadFools(), id);
	if (!song?.charts[level]) return undefined;
	return {
		filename: phiraPackFile(song.id, level),
		key: foolsPackKey(song, level),
	};
}

/** Catalog rows with difficulty 0 and the label as third cell: findable and downloadable, not scored */
export function foolsSummaries(
	songs: readonly FoolsSong[],
	aliases?: AliasIndex["byId"],
): ChartSummary[] {
	return songs.map((s) => {
		const charts: ChartSummary["charts"] = {};
		for (const level of PHIRA_LEVELS) {
			const chart = s.charts[level];
			if (chart) {
				const cell: ChartCell = [0, chart.notes, chart.label];
				charts[level] = cell;
			}
		}
		return sideSummary(s, charts, aliases);
	});
}

export function foolsRows(songs: readonly FoolsSong[]): SideRows {
	return { songs, rows: (aliases) => foolsSummaries(songs, aliases) };
}
