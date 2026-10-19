import { HISTORY_PREFIX } from "@/lib/assets";
import { isPackLevel } from "@/lib/chart-catalog";
import { text } from "@/lib/parse";
import { phiraPackFile, phiraPackKey } from "@/phi/lib/phira";
import { jsonLoader } from "./manifest";
import { chartBase, chartRows, findSong, songIds, songRows } from "./side-tree";

// Older chart revisions under `history/<apk>/`; `history/index.json` lists each song's eras (scripts/publish-history.ts)
const HISTORY_MANIFEST_KEY = `${HISTORY_PREFIX}/index.json`;
/** A version name, or `<name>-<code>` for a later build that shipped under a name already listed */
const VERSION = /^[\d.]+(?:-\d+)?$/;

export type EraChart = {
	label: string;
	notes: number | null;
	charter: string;
	rev?: string;
};

export type Era = {
	versions: string[];
	charts: Record<string, EraChart>;
};

export type SongHistory = {
	id: string;
	stem: string;
	current: string[];
	eras: Era[];
};

const manifest = jsonLoader(
	HISTORY_MANIFEST_KEY,
	parseHistoryManifest,
	[] as SongHistory[],
);

function versionList(v: unknown): string[] {
	return Array.isArray(v)
		? v.filter((x): x is string => typeof x === "string" && VERSION.test(x))
		: [];
}

function parseEra(raw: unknown): Era | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const r = raw as Record<string, unknown>;
	const versions = versionList(r.versions);
	const charts: Era["charts"] = {};
	for (const [level, c] of chartRows(r)) {
		if (!isPackLevel(level)) continue;
		const at = text(c.rev);
		charts[level] = {
			...chartBase(c),
			...(VERSION.test(at) ? { rev: at } : {}),
		};
	}
	if (!versions.length || !Object.keys(charts).length) return undefined;
	return { versions, charts };
}

/** One bad song or era is skipped, not the whole manifest. Ids get the catalog's `.0` */
export function parseHistoryManifest(raw: unknown): SongHistory[] {
	const out: SongHistory[] = [];
	for (const r of songRows(raw)) {
		const id = text(r.id).trim();
		const eras = Array.isArray(r.eras)
			? r.eras.flatMap((e) => parseEra(e) ?? [])
			: [];
		if (!id || !eras.length) continue;
		out.push({
			...songIds(id, r.stem),
			current: versionList(r.current),
			eras,
		});
	}
	return out;
}

export function loadHistory(): Promise<SongHistory[]> {
	return manifest.load();
}

export async function songHistory(
	id: string,
): Promise<SongHistory | undefined> {
	return findSong(await loadHistory(), id);
}

/** The pack of `level` as it was in APK `rev`, when an era names it */
export async function historyPack(
	id: string,
	level: string,
	rev: string,
): Promise<{ filename: string; key: string } | undefined> {
	const song = await songHistory(id);
	const listed = song?.eras.some((era) => era.charts[level]?.rev === rev);
	if (!song || !listed) return undefined;
	return {
		filename: phiraPackFile(song.id, level).replace(/\.pez$/, `-v${rev}.pez`),
		key: phiraPackKey(song.stem, level, `${HISTORY_PREFIX}/${rev}`),
	};
}
