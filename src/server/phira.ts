import { packOf } from "@/lib/assets";
import { bareId, isExtraPackLevel, packLevelName } from "@/lib/chart-catalog";
import { getInfo } from "@/phi/lib/get-info";
import { isPhiraLevel, phiraPackFile, phiraPackKey } from "@/phi/lib/phira";
import { listPublicAssets } from "./assets";
import { cellOf } from "./charts";
import { foolsPack } from "./fools";
import { historyPack } from "./history";
import { type R2Stream, streamR2Object } from "./r2";
import { removedExtraLevels, removedPack } from "./removed";
import { ensureSongInfo } from "./song-info";

export type PhiraErr = {
	error: "bad_level" | "unknown_chart" | "missing";
};

function songOf(id: string) {
	const bare = bareId(id);
	return getInfo.raw(bare) || getInfo.raw(`${bare}.0`);
}

async function stream(
	key: string,
	filename: string,
): Promise<({ filename: string } & R2Stream) | PhiraErr> {
	const got = await streamR2Object(key);
	return got ? { filename, ...got } : { error: "missing" };
}

/** Streamed: packs can pass the 4.5 MB function body limit */
export async function buildPhira(
	id: string,
	level: string,
	ver?: string,
): Promise<({ filename: string } & R2Stream) | PhiraErr> {
	if (!isPhiraLevel(level) && !isExtraPackLevel(level)) {
		return { error: "bad_level" };
	}
	// `ver` picks an older revision; a version the history does not list for this chart is unknown, not the current one
	if (ver) {
		const old = await historyPack(id, level, ver);
		return old ? stream(old.key, old.filename) : { error: "unknown_chart" };
	}
	await ensureSongInfo();
	// The game no longer ships it, so the manifest wins even where spinfo.json still gives the song a constant
	const gone = await removedPack(id, level);
	if (gone) return stream(gone.key, gone.filename);
	const song = songOf(id);
	if (song && isPhiraLevel(level) && cellOf(song.chart?.[level])) {
		return stream(phiraPackKey(song.id, level), phiraPackFile(song.id, level));
	}
	// A 4/1 special has no constant, so it never gets this far; its pack sits under 4-1/
	const special = isPhiraLevel(level) ? await foolsPack(id, level) : undefined;
	if (special) return stream(special.key, special.filename);
	if (song && isExtraPackLevel(level)) {
		return stream(phiraPackKey(song.id, level), phiraPackFile(song.id, level));
	}
	return { error: "unknown_chart" };
}

const extrasOf = new WeakMap<
	readonly { key: string }[],
	Map<string, string[]>
>();

/** Song stem → its extra packs in the main `phira/` tree, worked out once per listing */
function extraPacks(files: readonly { key: string }[]): Map<string, string[]> {
	let byStem = extrasOf.get(files);
	if (byStem) return byStem;
	byStem = new Map();
	for (const { key } of files) {
		const pack = key.startsWith("phira/") ? packOf(key) : undefined;
		if (!pack || !isExtraPackLevel(pack.folder)) continue;
		byStem.set(pack.stem, [...(byStem.get(pack.stem) ?? []), pack.folder]);
	}
	extrasOf.set(files, byStem);
	return byStem;
}

/** R2's packs for a song beyond the four scored levels, from the bucket listing plus the removed manifest */
export async function phiraExtras(
	id: string,
	list: () => Promise<{ key: string }[]> = listPublicAssets,
): Promise<string[]> {
	await ensureSongInfo();
	const song = songOf(id);
	const [files, removed] = await Promise.all([
		song ? list().catch(() => []) : [],
		removedExtraLevels(id).catch(() => []),
	]);
	const levels = song ? (extraPacks(files).get(bareId(song.id)) ?? []) : [];
	return [...new Set([...levels, ...removed])].sort((a, b) =>
		(packLevelName(a)?.label ?? a).localeCompare(packLevelName(b)?.label ?? b),
	);
}
