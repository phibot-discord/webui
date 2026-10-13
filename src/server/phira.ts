import { getInfo } from "@/phi/lib/get-info";
import { isPhiraLevel, phiraPackFile, phiraPackKey } from "@/phi/lib/phira";
import { cellOf } from "./charts";
import { foolsPack } from "./fools";
import { type R2Stream, streamR2Object } from "./r2";
import { ensureSongInfo } from "./song-info";

export type PhiraErr = {
	error: "bad_level" | "unknown_chart" | "missing";
};

/** Streamed: packs can pass the 4.5 MB function body limit */
export async function buildPhira(
	id: string,
	level: string,
): Promise<({ filename: string } & R2Stream) | PhiraErr> {
	if (!isPhiraLevel(level)) return { error: "bad_level" };
	await ensureSongInfo();
	const bare = id.replace(/\.0$/, "");
	const song = getInfo.raw(bare) || getInfo.raw(`${bare}.0`);
	if (!song || !cellOf(song.chart?.[level])) {
		// A 4/1 special has no constant, so it never gets this far; its pack sits under 4-1/
		const special = await foolsPack(id, level);
		if (!special) return { error: "unknown_chart" };
		const got = await streamR2Object(special.key);
		return got ? { filename: special.filename, ...got } : { error: "missing" };
	}
	const filename = phiraPackFile(song.id, level);
	const got = await streamR2Object(phiraPackKey(song.id, level));
	if (!got) return { error: "missing" };
	return { filename, ...got };
}
