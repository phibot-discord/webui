import { FOOLS_PREFIX } from "@/lib/assets";
import { withDotZero } from "@/phi/lib/get-info";
import {
	PHIRA_LEVELS,
	type PhiraLevel,
	phiraPackFile,
	phiraPackKey,
} from "@/phi/lib/phira";
import type { AliasIndex } from "./aliases";
import { runInBackground } from "./background";
import type { ChartCell, ChartSummary } from "./charts";
import { logger } from "./logger";
import { fetchR2Object, r2Ready } from "./r2";

// April Fools (4/1) specials: charts the game only shipped for a day. R2 holds them under `4-1/` in the
// normal layout (`4-1/phira/IN/<id>-IN.pez`, `4-1/original_ill/ill/<id>.png`, `4-1/music/<id>.ogg`) and
// `4-1/index.json` lists what exists. scripts/publish-fools.ts writes all of it
export const FOOLS_MANIFEST_KEY = `${FOOLS_PREFIX}/index.json`;

export type FoolsChart = {
	/** Shown where a constant would be: these charts have none */
	label: string;
	charter: string;
	notes: number | null;
};

export type FoolsSong = {
	/** Catalog id, `.0` included */
	id: string;
	song: string;
	composer: string;
	/** `4-1/original_ill/{ill,illLow,illBlur}/<id>.png` exist */
	jacket: boolean;
	charts: Partial<Record<PhiraLevel, FoolsChart>>;
};

const TTL_MS = 5 * 60 * 1000;
const RETRY_MS = 60 * 1000;

let cached: { songs: FoolsSong[]; until: number } | undefined;
let inflight: Promise<FoolsSong[]> | undefined;

export function resetFoolsForTest() {
	cached = undefined;
	inflight = undefined;
}

function text(v: unknown): string {
	return typeof v === "string" ? v : "";
}

/** One bad song or chart is skipped, not the whole manifest. Ids get the catalog's `.0` */
export function parseFoolsManifest(raw: unknown): FoolsSong[] {
	const body = raw as { v?: unknown; songs?: unknown } | null;
	if (!body || typeof body !== "object" || body.v !== 1) return [];
	if (!Array.isArray(body.songs)) return [];
	const out: FoolsSong[] = [];
	for (const row of body.songs) {
		if (!row || typeof row !== "object") continue;
		const r = row as Record<string, unknown>;
		const id = text(r.id).trim();
		const song = text(r.song).trim();
		const levels = r.charts && typeof r.charts === "object" ? r.charts : {};
		const charts: FoolsSong["charts"] = {};
		for (const level of PHIRA_LEVELS) {
			const c = (levels as Record<string, unknown>)[level];
			if (!c || typeof c !== "object") continue;
			const { label, charter, notes } = c as Record<string, unknown>;
			charts[level] = {
				label: text(label).trim() || "?",
				charter: text(charter),
				notes:
					typeof notes === "number" && Number.isInteger(notes) && notes > 0
						? notes
						: null,
			};
		}
		if (!id || !song || !Object.keys(charts).length) continue;
		out.push({
			id: withDotZero(id),
			song,
			composer: text(r.composer),
			jacket: r.jacket === true,
			charts,
		});
	}
	return out;
}

async function read(): Promise<FoolsSong[] | undefined> {
	// Not memoised as missing: a manifest published after a miss should show up within the TTL
	const buf = await fetchR2Object(FOOLS_MANIFEST_KEY, {
		cache: "no-store",
		negative: false,
	});
	if (!buf?.byteLength) return undefined;
	try {
		return parseFoolsManifest(JSON.parse(buf.toString("utf8")));
	} catch (err) {
		logger.warn(
			`4-1 manifest unreadable: ${err instanceof Error ? err.message : err}`,
		);
		return undefined;
	}
}

function refresh(): Promise<FoolsSong[]> {
	inflight ??= read()
		.catch((err: unknown) => {
			logger.warn(
				`4-1 manifest skipped: ${err instanceof Error ? err.message : err}`,
			);
			return undefined;
		})
		.then((songs) => {
			cached = songs
				? { songs, until: Date.now() + TTL_MS }
				: { songs: cached?.songs ?? [], until: Date.now() + RETRY_MS };
			return cached.songs;
		})
		.finally(() => {
			inflight = undefined;
		});
	return inflight;
}

/** The manifest's songs, from memory for 5 min; after that the old list is served while one read refreshes it, so only a cold start waits. A failed read keeps the last good list and asks again in a minute */
export function loadFools(): Promise<FoolsSong[]> {
	if (cached && Date.now() < cached.until) return Promise.resolve(cached.songs);
	if (!r2Ready()) return Promise.resolve([]);
	if (!cached) return refresh();
	if (!inflight) runInBackground(refresh());
	return Promise.resolve(cached.songs);
}

function bare(id: string): string {
	return id.replace(/\.0$/, "");
}

export function foolsPackKey(song: FoolsSong, level: PhiraLevel): string {
	return phiraPackKey(song.id, level, FOOLS_PREFIX);
}

/** Where the Phira pack for `id`'s `level` lives, when the manifest lists that chart */
export async function foolsPack(
	id: string,
	level: PhiraLevel,
): Promise<{ filename: string; key: string } | undefined> {
	const want = bare(id);
	const song = (await loadFools()).find((s) => bare(s.id) === want);
	if (!song?.charts[level]) return undefined;
	return {
		filename: phiraPackFile(song.id, level),
		key: foolsPackKey(song, level),
	};
}

/** Catalog rows with difficulty 0 and the label as the third cell element: they can be found and downloaded, not scored */
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
		const nicks = aliases?.get(s.id);
		return {
			id: s.id,
			song: s.song,
			composer: s.composer,
			...(nicks?.length ? { aliases: nicks.map((a) => a.text) } : {}),
			charts,
		};
	});
}
