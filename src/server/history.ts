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

export type HistoryTable = { version: string; code: number; key: string };

export type HistoryBuild = { version: string; code: number };

type HistoryManifest = {
	songs: SongHistory[];
	tables: HistoryTable[];
	latest?: HistoryBuild;
};

const manifest = jsonLoader<HistoryManifest>(
	HISTORY_MANIFEST_KEY,
	(raw) => {
		const latest = parseHistoryLatest(raw);
		return {
			songs: parseHistoryManifest(raw),
			tables: parseHistoryTables(raw),
			...(latest ? { latest } : {}),
		};
	},
	{ songs: [], tables: [] },
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

export function parseHistoryTables(raw: unknown): HistoryTable[] {
	const tables = (raw as { tables?: unknown } | null)?.tables;
	if (!tables || typeof tables !== "object" || Array.isArray(tables)) return [];
	const out: HistoryTable[] = [];
	for (const [version, row] of Object.entries(tables)) {
		const r = row as { code?: unknown; key?: unknown } | null;
		const code = r?.code;
		if (
			!VERSION.test(version) ||
			typeof code !== "number" ||
			!Number.isInteger(code) ||
			code <= 0
		) {
			continue;
		}
		if (r?.key !== `${HISTORY_PREFIX}/${version}/info/info.csv`) continue;
		out.push({ version, code, key: r.key });
	}
	return out.sort((a, b) => a.code - b.code);
}

export function parseHistoryLatest(raw: unknown): HistoryBuild | undefined {
	const r = raw as { versions?: unknown; codes?: unknown } | null;
	const codes =
		r?.codes && typeof r.codes === "object"
			? (r.codes as Record<string, unknown>)
			: {};
	let best: HistoryBuild | undefined;
	for (const version of versionList(r?.versions)) {
		const code = codes[version];
		if (typeof code !== "number" || !Number.isInteger(code) || code <= 0)
			continue;
		if (!best || code > best.code) best = { version, code };
	}
	return best;
}

export async function loadHistory(): Promise<SongHistory[]> {
	return (await manifest.load()).songs;
}

export async function historyTables(): Promise<HistoryTable[]> {
	return (await manifest.load()).tables;
}

export async function historyLatest(): Promise<HistoryBuild | undefined> {
	return (await manifest.load()).latest;
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
