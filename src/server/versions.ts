import { shownVersion } from "@/lib/apk-version";
import {
	parseVersionMeta,
	parseVersionTable,
	VERSION_LEVELS,
	type VersionLevel,
	type VersionMeta,
	type VersionSong,
	type VersionTable,
} from "@/lib/versions";
import { getInfo } from "@/phi/lib/get-info";
import { evictOldest } from "@/phi/lib/lru";
import { readPhiVersion } from "@/phi/lib/version";
import { publicFiles } from "./assets";
import { historyLatest, historyTables } from "./history";
import { logger } from "./logger";
import { poolAll } from "./pool";
import { fetchR2Object } from "./r2";
import { ensureSongInfo } from "./song-info";

const PREFIX = "info/oldInfo/";
const TABLE = /^info\/oldInfo\/(\d+)\/change\.csv$/;
const LIST_TTL_MS = 60 * 60 * 1000;
const PROBE_FROM = 90;
const PROBE_PARALLEL = 8;
const TABLES_KEPT = 8;

export type VersionOption = VersionMeta & { current?: true; key?: string };

let codes: { at: number; list: number[] } | undefined;
const metas = new Map<number, VersionMeta | null>();
const tables = new Map<number, VersionTable>();

async function readJson(key: string): Promise<unknown> {
	const buf = await fetchR2Object(key);
	if (!buf?.byteLength) return undefined;
	try {
		return JSON.parse(buf.toString("utf8"));
	} catch {
		return undefined;
	}
}

async function metaOf(code: number): Promise<VersionMeta | null> {
	const hit = metas.get(code);
	if (hit !== undefined) return hit;
	const raw = await readJson(`${PREFIX}${code}/info.json`);
	if (raw === undefined) return null;
	const meta = parseVersionMeta(raw, code) ?? null;
	metas.set(code, meta);
	return meta;
}

async function listedCodes(): Promise<number[]> {
	try {
		const files = await publicFiles();
		return [...files.keys()].flatMap((key) => {
			const m = TABLE.exec(key);
			return m ? [Number(m[1])] : [];
		});
	} catch (err) {
		logger.warn(
			`version list from probes: ${err instanceof Error ? err.message : err}`,
		);
		const top = readPhiVersion().phigrosVerNum;
		const probe = Array.from(
			{ length: Math.max(0, top - PROBE_FROM) },
			(_, i) => PROBE_FROM + i,
		);
		const found: number[] = [];
		await poolAll(probe, PROBE_PARALLEL, async (code) => {
			if (await metaOf(code).catch(() => null)) found.push(code);
		});
		return found;
	}
}

async function oldCodes(): Promise<number[]> {
	if (codes && Date.now() - codes.at < LIST_TTL_MS) return codes.list;
	const list = (await listedCodes()).sort((a, b) => a - b);
	codes = { at: Date.now(), list };
	return list;
}

export async function versionOptions(): Promise<VersionOption[]> {
	await ensureSongInfo();
	const [old, own, latest] = await Promise.all([
		oldCodes(),
		historyTables().catch(() => []),
		historyLatest().catch(() => undefined),
	]);
	const phi = readPhiVersion();
	const now =
		latest && latest.code > phi.phigrosVerNum
			? { label: shownVersion(latest.version), code: latest.code }
			: { label: phi.phigros, code: phi.phigrosVerNum };
	const byCode = new Map<number, VersionOption>();
	await poolAll(
		old.filter((c) => c < now.code),
		PROBE_PARALLEL,
		async (code) => {
			const meta = await metaOf(code).catch(() => null);
			if (meta) byCode.set(code, meta);
		},
	);
	for (const table of own) {
		if (table.code >= now.code) continue;
		const meta = byCode.get(table.code);
		byCode.set(table.code, {
			code: table.code,
			label: meta?.label ?? shownVersion(table.version),
			date: meta?.date ?? null,
			notes: meta?.notes ?? "",
			key: table.key,
		});
	}
	const meta = await metaOf(now.code).catch(() => null);
	byCode.set(now.code, {
		code: now.code,
		label: now.label,
		date: meta?.date ?? null,
		notes: meta?.notes ?? "",
		current: true,
	});
	return [...byCode.values()].sort((a, b) => a.code - b.code);
}

function currentTable(): VersionTable {
	const out = new Map<string, VersionSong>();
	for (const song of Object.values(getInfo.ori_info)) {
		const levels: VersionSong["levels"] = {};
		for (const level of VERSION_LEVELS) {
			const c = Number(song.chart?.[level as VersionLevel]?.difficulty);
			if (Number.isFinite(c) && c > 0) levels[level] = c;
		}
		out.set(song.id, { song: song.song, levels });
	}
	return out;
}

export async function versionTable(
	option: Pick<VersionOption, "code" | "current" | "key">,
): Promise<VersionTable | undefined> {
	if (option.current) {
		await ensureSongInfo();
		return currentTable();
	}
	const hit = tables.get(option.code);
	if (hit) return hit;
	const buf = await fetchR2Object(
		option.key ?? `${PREFIX}${option.code}/change.csv`,
	);
	if (!buf?.byteLength) return undefined;
	const table = parseVersionTable(buf.toString("utf8"));
	if (!table.size) return undefined;
	tables.set(option.code, table);
	evictOldest(tables, TABLES_KEPT);
	return table;
}
