import { v1Body } from "@/lib/parse";
import { jsonLoader } from "./manifest";
import { r2Config } from "./r2";

// Songs with a jacket per difficulty: `original_ill/<size>/<level>/<id>.png`, listed in `original_ill/levels.json`
export type IllLevels = Map<string, string[]>;

/** The charts a jacket can belong to; SP has none */
const JACKET_LEVELS = ["EZ", "HD", "IN", "AT"] as const;

const manifest = jsonLoader(
	() => illLevelsKey(),
	parseIllLevels,
	new Map() as IllLevels,
);

export function resetIllLevelsForTest() {
	manifest.reset();
}

export function illLevelsKey(prefix = r2Config().prefix): string {
	return prefix ? `${prefix}/levels.json` : "levels.json";
}

/** Ids are as the manifest has them (`.0` or not); a song without a known level is skipped */
export function parseIllLevels(raw: unknown): IllLevels {
	const out: IllLevels = new Map();
	const body = v1Body(raw);
	if (!body) return out;
	if (!body.songs || typeof body.songs !== "object") return out;
	for (const [id, list] of Object.entries(body.songs)) {
		if (!Array.isArray(list)) continue;
		const levels = JACKET_LEVELS.filter((level) => list.includes(level));
		if (id.trim() && levels.length) out.set(id.trim(), levels);
	}
	return out;
}

/** The songs with a jacket per difficulty, cached like loadFools; without a good read every song uses its own */
export function loadIllLevels(): Promise<IllLevels> {
	return manifest.load();
}
