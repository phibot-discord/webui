// Builds the R2 `history/` tree from a survey of old APKs; scripts/r2-upload.mjs sends it
//   node --env-file=.env.local --import tsx scripts/publish-history.ts <work dir> <out dir>
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { countNotes, fetchPublic as fetchFrom } from "./publish-common";

type Revision = {
	versions: string[];
	notes: number;
	difficulty: number | null;
	displayLevel: string | null;
	charter: string | null;
	current: boolean;
};
type History = {
	versions: string[];
	songs: Record<
		string,
		{ name: string | null; levels: Record<string, Revision[]> }
	>;
};
type Extracted = {
	id: string;
	level: string;
	apk: string;
	versions: string[];
	file: string;
	music: string;
	notes: number;
	difficulty: number | null;
	displayLevel: string | null;
	charter: string | null;
};
type LevelInfo = {
	difficulty?: number | null;
	level?: string | number | null;
	charter?: string | null;
};
type Survey = {
	versions: Record<
		string,
		{ songs: Record<string, { levelInfo?: Record<string, LevelInfo> }> }
	>;
};

const ERA_LEVELS = ["EZ", "HD", "IN", "AT", "SP"];

const [workArg, outArg] = process.argv.slice(2);
if (!workArg || !outArg) {
	console.error("usage: publish-history.ts <work dir> <out dir>");
	process.exit(1);
}
const work = resolve(workArg);
const out = resolve(outArg);

const { packPhiraChart, phiraPackKey } = await import("../src/phi/lib/phira");
const { HISTORY_PREFIX, REMOVED_PREFIX, SIDE_ILL_DIR } = await import(
	"../src/lib/assets"
);

const read = async <T>(path: string) =>
	JSON.parse(await readFile(path, "utf8")) as T;
const history = await read<History>(join(work, "history.json"));
const survey = await read<Survey>(join(work, "survey.json"));
const extracted = await read<Extracted[]>(join(work, "out", "manifest.json"));
const fetchPublic = (key: string) => fetchFrom(key, "publish-history");

const removedSongs = (
	JSON.parse(
		(await fetchPublic(`${REMOVED_PREFIX}/index.json`)).toString("utf8"),
	) as {
		songs: {
			id: string;
			song: string;
			composer: string;
			illustrator: string;
			gone: boolean;
			charts: Record<string, { from: string }>;
		}[];
	}
).songs;
const removed = removedSongs.filter((s) => s.gone);
/** `<catalog id>/<level>` → the APK its `removed/` pack came from */
const removedFrom = new Map(
	removedSongs.flatMap((s) =>
		Object.entries(s.charts).map(([level, c]) => [`${s.id}/${level}`, c.from]),
	),
);
// The bucket's copy: the bundled one lags the game
const infoCsv = new Map<string, string[]>(
	(await fetchPublic("info/info.csv"))
		.toString("utf8")
		.split("\n")
		.slice(1)
		.map((line) => line.split("\t"))
		.map((row) => [`${row[0]}.0`, row] as const),
);

/** The id the catalog knows the song by, and its credits: a dropped song goes by its `removed/` row */
function catalogSong(gameId: string, name: string | null) {
	const id = gameId.endsWith(".0") ? gameId : `${gameId}.0`;
	const row = infoCsv.get(id);
	if (row) {
		return {
			id,
			name: row[1] ?? "",
			composer: row[2] ?? "",
			illustrator: row[3] ?? "",
			gone: false,
		};
	}
	const gone = removed.find(
		(s) => s.id === id || (name != null && s.song === name),
	);
	if (!gone) return undefined;
	return {
		id: gone.id,
		name: gone.song,
		composer: gone.composer,
		illustrator: gone.illustrator,
		gone: true,
	};
}

const pictures = new Map<string, Promise<Buffer>>();
/** The low-res jacket, the picture the ripper puts in its packs; kept under <out>/.cache */
function picture(stem: string, gone: boolean): Promise<Buffer> {
	const key = `${gone ? `${REMOVED_PREFIX}/` : ""}${SIDE_ILL_DIR}/illLow/${stem}.png`;
	let job = pictures.get(key);
	if (!job) {
		job = (async () => {
			const cache = join(out, ".cache", key);
			if (existsSync(cache)) return readFile(cache);
			const body = await fetchPublic(key);
			await mkdir(dirname(cache), { recursive: true });
			await writeFile(cache, body);
			return body;
		})();
		pictures.set(key, job);
	}
	return job;
}

function label(id: string, level: string, version: string, rev: Revision) {
	const info = survey.versions[version]?.songs[id]?.levelInfo?.[level];
	const constant = info?.difficulty ?? rev.difficulty;
	if (typeof constant === "number" && constant > 0) return constant.toFixed(1);
	const shown = info?.level ?? rev.displayLevel;
	return shown != null && String(shown).trim() ? String(shown).trim() : "?";
}

const same = <T>(a: T[], b: T[]) =>
	a.length === b.length && a.every((v, i) => v === b[i]);

const written = new Set<string>();
let bytes = 0;
async function emit(key: string, body: Uint8Array) {
	const path = join(out, key);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, body);
	written.add(key);
	bytes += body.byteLength;
}

const tracks = new Map<string, Promise<Buffer>>();
const track = (file: string) => {
	let job = tracks.get(file);
	if (!job) {
		job = readFile(file);
		tracks.set(file, job);
	}
	return job;
};

const songs: unknown[] = [];
let skipped = 0;

for (const [gameId, entry] of Object.entries(history.songs)) {
	const song = catalogSong(gameId, entry.name);
	if (!song) {
		skipped += 1;
		console.warn(`skip ${gameId}: not in info.csv or removed/`);
		continue;
	}
	// A song's levels share one track; dropping it keeps the run from holding every ogg
	tracks.clear();
	// Files go by the game's track folder whatever the catalog calls the song
	const stem = gameId.replace(/\.0$/, "");
	const levels = ERA_LEVELS.filter((l) => entry.levels[l]?.length);
	const mapOf = (v: string) =>
		levels.map(
			(l) => entry.levels[l]?.findIndex((r) => r.versions.includes(v)) ?? -1,
		);
	const present = history.versions.filter((v) => mapOf(v).some((i) => i >= 0));
	if (!present.length) continue;
	const runs: { versions: string[]; map: number[] }[] = [];
	for (const v of present) {
		const map = mapOf(v);
		const last = runs.at(-1);
		if (last && same(last.map, map)) last.versions.push(v);
		else runs.push({ versions: [v], map });
	}
	const current = runs.at(-1) as (typeof runs)[number];
	const eras: unknown[] = [];
	for (const run of runs.slice(0, -1).reverse()) {
		if (same(run.map, current.map)) continue;
		const newest = run.versions.at(-1) as string;
		const charts: Record<string, unknown> = {};
		for (const [i, level] of levels.entries()) {
			const at = run.map[i] ?? -1;
			const rev = at >= 0 ? entry.levels[level]?.[at] : undefined;
			if (!rev) continue;
			const shown = label(gameId, level, newest, rev);
			const charter =
				survey.versions[newest]?.songs[gameId]?.levelInfo?.[level]?.charter ??
				rev.charter ??
				"";
			// The site serves this one already, from the main tree or (a chart the game dropped) from removed/
			const from = removedFrom.get(`${song.id}/${level}`);
			if (rev.current || (from && rev.versions.includes(from))) {
				charts[level] = { label: shown, notes: rev.notes, charter };
				continue;
			}
			const source = extracted.find(
				(e) =>
					e.id === gameId &&
					e.level === level &&
					same(e.versions, rev.versions),
			);
			if (!source)
				throw new Error(
					`${gameId} ${level}: revision ${rev.versions.join(",")} not extracted`,
				);
			const key = phiraPackKey(stem, level, `${HISTORY_PREFIX}/${source.apk}`);
			if (!written.has(key)) {
				const chart = await readFile(join(work, "out", source.file));
				const notes = countNotes(JSON.parse(chart.toString("utf8")));
				if (notes !== source.notes) {
					throw new Error(
						`${gameId} ${level} ${source.apk}: ${notes} notes, manifest says ${source.notes}`,
					);
				}
				const pack = await packPhiraChart({
					id: stem,
					name: song.name,
					level,
					difficulty: label(gameId, level, source.apk, rev),
					composer: song.composer,
					illustrator: song.illustrator,
					charter: source.charter ?? rev.charter ?? "",
					chart,
					picture: await picture(stem, song.gone),
					song: await track(join(work, "out", source.music)),
				});
				await emit(key, pack);
				await emit(
					`${HISTORY_PREFIX}/${source.apk}/chart/${stem}/${level}.json`,
					chart,
				);
			}
			charts[level] = {
				label: shown,
				notes: rev.notes,
				charter,
				rev: source.apk,
			};
		}
		eras.push({ versions: run.versions, charts });
	}
	if (eras.length)
		songs.push({ id: song.id, stem, current: current.versions, eras });
}

await emit(
	`${HISTORY_PREFIX}/index.json`,
	Buffer.from(
		`${JSON.stringify({ v: 1, versions: history.versions, songs }, null, "\t")}\n`,
	),
);
console.log(
	`${songs.length} songs with older eras, ${written.size} files, ${bytes} bytes under ${join(out, HISTORY_PREFIX)}${skipped ? `, ${skipped} skipped` : ""}`,
);
