import { runInBackground } from "./background";
import { logger } from "./logger";
import { fetchR2Object, r2Config, r2Ready } from "./r2";

// A few songs ship a different jacket per difficulty. phi-unpackd publishes those as
// `original_ill/{ill,illLow,illBlur}/<level>/<id>.png` next to the song's own jacket, and lists the songs
// in `original_ill/levels.json`: `{ v: 1, songs: { <id>: [<level>, …] } }`
export type IllLevels = Map<string, string[]>;

/** The charts a jacket can belong to; SP has none */
const JACKET_LEVELS = ["EZ", "HD", "IN", "AT"] as const;

const TTL_MS = 5 * 60 * 1000;
const RETRY_MS = 60 * 1000;

let cached: { levels: IllLevels; until: number } | undefined;
let inflight: Promise<IllLevels> | undefined;

export function resetIllLevelsForTest() {
	cached = undefined;
	inflight = undefined;
}

export function illLevelsKey(prefix = r2Config().prefix): string {
	return prefix ? `${prefix}/levels.json` : "levels.json";
}

/** Ids are as the manifest has them (`.0` or not); a song without a known level is skipped */
export function parseIllLevels(raw: unknown): IllLevels {
	const out: IllLevels = new Map();
	const body = raw as { v?: unknown; songs?: unknown } | null;
	if (!body || typeof body !== "object" || body.v !== 1) return out;
	if (!body.songs || typeof body.songs !== "object") return out;
	for (const [id, list] of Object.entries(body.songs)) {
		if (!Array.isArray(list)) continue;
		const levels = JACKET_LEVELS.filter((level) => list.includes(level));
		if (id.trim() && levels.length) out.set(id.trim(), levels);
	}
	return out;
}

async function read(): Promise<IllLevels | undefined> {
	// Not memoised as missing: a manifest published after a miss should show up within the TTL
	const buf = await fetchR2Object(illLevelsKey(), {
		cache: "no-store",
		negative: false,
	});
	if (!buf?.byteLength) return undefined;
	try {
		return parseIllLevels(JSON.parse(buf.toString("utf8")));
	} catch (err) {
		logger.warn(
			`jacket levels unreadable: ${err instanceof Error ? err.message : err}`,
		);
		return undefined;
	}
}

function refresh(): Promise<IllLevels> {
	inflight ??= read()
		.catch((err: unknown) => {
			logger.warn(
				`jacket levels skipped: ${err instanceof Error ? err.message : err}`,
			);
			return undefined;
		})
		.then((levels) => {
			cached = levels
				? { levels, until: Date.now() + TTL_MS }
				: { levels: cached?.levels ?? new Map(), until: Date.now() + RETRY_MS };
			return cached.levels;
		})
		.finally(() => {
			inflight = undefined;
		});
	return inflight;
}

/** The songs with a jacket per difficulty, from memory for 5 min; after that the old set is served while one read refreshes it, so only a cold start waits. A failed read keeps the last good set and asks again in a minute; without one, every song uses its own jacket */
export function loadIllLevels(): Promise<IllLevels> {
	if (cached && Date.now() < cached.until)
		return Promise.resolve(cached.levels);
	if (!r2Ready()) return Promise.resolve(new Map());
	if (!cached) return refresh();
	if (!inflight) runInBackground(refresh());
	return Promise.resolve(cached.levels);
}
