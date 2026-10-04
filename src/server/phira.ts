import { getInfo } from "@/phi/lib/get-info";
import { isPhiraLevel } from "@/phi/lib/phira";
import { fetchR2Object } from "./r2";
import { ensureSongInfo } from "./song-info";

export type PhiraErr = {
	error: "bad_level" | "unknown_chart" | "missing";
};

/** Serve the .pez the unpacker uploaded to R2. */
export async function buildPhira(
	id: string,
	level: string,
): Promise<{ filename: string; bytes: Uint8Array } | PhiraErr> {
	if (!isPhiraLevel(level)) return { error: "bad_level" };
	await ensureSongInfo();
	const bare = id.replace(/\.0$/, "");
	const song = getInfo.raw(bare) || getInfo.raw(`${bare}.0`);
	const chart = song?.chart?.[level];
	const difficulty = Number(chart?.difficulty);
	if (!song || !chart || !Number.isFinite(difficulty) || difficulty <= 0) {
		return { error: "unknown_chart" };
	}
	const base = song.id.replace(/\.0$/, "");
	const filename = `${base}-${level}.pez`;
	const bytes = await fetchR2Object(`phira/${level}/${filename}`, {
		cache: "no-store",
	});
	if (!bytes?.byteLength) return { error: "missing" };
	return { filename, bytes };
}
