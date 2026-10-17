// Builds the R2 `removed/` tree from charts taken from older APKs; nothing is uploaded without --upload
//   node --env-file=.env.local --import tsx scripts/publish-removed.ts <unpack root> <out dir> [--upload [--no-manifest|--manifest-only]]
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { countNotes, oneLine, publicBase, uploadTree } from "./publish-common";

type SourceChart = {
	file: string;
	notes: number;
	difficulty: number | null;
	displayLevel: string | null;
	charter: string | null;
	apk?: string;
	music?: string;
};
type Source = {
	id: string;
	folder: string;
	apk: string | null;
	gone: boolean;
	name: string;
	composer: string | null;
	illustrator: string | null;
	music: string | null;
	jacket: boolean;
	charts: Record<string, SourceChart>;
};
type SpSong = {
	song?: string;
	chart?: Record<string, { combo?: string; charter?: string }>;
};

// Charts the game's song list never named, so their charter is not with them in the APK
const CHARTERS: Record<string, string> = {
	"Wintercube.CtymaxfeatNceS.0/BND": "小鹏",
	"Wavetapper.Frums.0/SP": "百九十八、NerSAN",
};

const args = process.argv.slice(2);
const [srcArg, outArg] = args.filter((a) => !a.startsWith("--"));
if (!srcArg || !outArg) {
	console.error("usage: publish-removed.ts <unpack root> <out dir> [--upload]");
	process.exit(1);
}
const src = resolve(srcArg);
const out = resolve(outArg);
const upload = args.includes("--upload");
const skipManifest = args.includes("--no-manifest");
const manifestOnly = args.includes("--manifest-only");
if (skipManifest && manifestOnly) {
	console.error("--no-manifest does not go with --manifest-only");
	process.exit(1);
}

const { packPhiraChart, phiraPackKey } = await import("../src/phi/lib/phira");
const { REMOVED_PREFIX, SIDE_ILL_DIR } = await import("../src/lib/assets");

const sources = JSON.parse(
	await readFile(join(src, "manifest.json"), "utf8"),
) as Source[];
const spinfo = JSON.parse(
	await readFile(join("phi-assets", "info", "spinfo.json"), "utf8"),
) as Record<string, SpSong>;
const infoCsv = (await readFile(join("phi-assets", "info", "info.csv"), "utf8"))
	.split("\n")
	.slice(1)
	.map((line) => line.split("\t"));
const current = new Map(infoCsv.map((row) => [`${row[0]}.0`, row]));

/** The spinfo.json key that already stands for this song in the catalog, when its name and every note count agree */
function spinfoKey(s: Source): string | undefined {
	for (const [key, sp] of Object.entries(spinfo)) {
		if (sp.song?.trim() !== s.name.trim() || !sp.chart) continue;
		const agree = Object.entries(s.charts).every(
			([level, c]) => Number(sp.chart?.[level]?.combo) === c.notes,
		);
		if (agree) return key;
	}
	return undefined;
}

/** The current low-res jacket, the picture the ripper puts in its packs; kept under <out>/.cache */
async function currentPicture(stem: string): Promise<Buffer> {
	const cache = join(out, ".cache", "illLow", `${stem}.png`);
	if (existsSync(cache)) return readFile(cache);
	const res = await fetch(
		`${publicBase}/original_ill/illLow/${encodeURIComponent(stem)}.png`,
		{ headers: { "User-Agent": "Mozilla/5.0 publish-removed" } },
	);
	if (!res.ok) throw new Error(`${stem}: illLow ${res.status}`);
	const body = Buffer.from(await res.arrayBuffer());
	if (!body.subarray(0, 8).equals(Buffer.from("\x89PNG\r\n\x1a\n", "binary"))) {
		throw new Error(`${stem}: illLow is not a PNG`);
	}
	await mkdir(dirname(cache), { recursive: true });
	await writeFile(cache, body);
	return body;
}

const files = new Map<string, { body: Uint8Array; type: string }>();
const manifest: unknown[] = [];

for (const s of sources) {
	const key = s.gone ? spinfoKey(s) : undefined;
	const id = key ? `${key}.0` : s.id;
	// Files go by the game's track folder whatever the catalog calls the song
	const stem = s.folder.replace(/\.0$/, "");
	const row = current.get(s.id);
	if (!s.gone && !row) throw new Error(`${s.id} is not in info.csv`);
	const name = oneLine(s.name || row?.[1]);
	const composer = oneLine(s.composer || row?.[2]);
	const illustrator = oneLine(s.illustrator || row?.[3]);
	const jackets = ["ill", "illLow", "illBlur"].map((dir) =>
		join(src, s.apk ?? "", "original_ill", dir, `${stem}.png`),
	);
	const jacket = s.gone && !!s.apk && jackets.every((p) => existsSync(p));
	if (s.gone && !jacket) throw new Error(`${s.id}: gone but no jackets`);
	const picture = jacket
		? await readFile(jackets[1] as string)
		: await currentPicture(stem);
	const charts: Record<string, unknown> = {};
	for (const [level, c] of Object.entries(s.charts)) {
		const chart = await readFile(join(src, c.file));
		const notes = countNotes(JSON.parse(chart.toString("utf8")));
		if (notes !== c.notes) {
			throw new Error(
				`${s.id} ${level}: ${notes} notes, manifest says ${c.notes}`,
			);
		}
		const from = c.apk ?? s.apk;
		const music = c.music ?? s.music;
		if (!from || !music) throw new Error(`${s.id} ${level}: no APK or music`);
		const song = await readFile(join(src, music));
		const label =
			c.difficulty != null ? c.difficulty.toFixed(1) : c.displayLevel || "?";
		const charter = oneLine(c.charter) || CHARTERS[`${s.id}/${level}`] || "";
		const pack = await packPhiraChart({
			id: stem,
			name,
			level,
			difficulty: label,
			composer,
			illustrator,
			charter,
			chart,
			picture,
			song,
		});
		files.set(phiraPackKey(stem, level), {
			body: pack,
			type: "application/octet-stream",
		});
		files.set(`chart/${stem}/${level}.json`, {
			body: chart,
			type: "application/json",
		});
		charts[level] = { label, charter, notes, from };
		console.log(
			`${id} ${level}: ${notes} notes, ${label}, from ${from}, music ${createHash("sha1").update(song).digest("hex").slice(0, 8)}`,
		);
	}
	if (jacket) {
		for (const [i, dir] of ["ill", "illLow", "illBlur"].entries()) {
			files.set(`${SIDE_ILL_DIR}/${dir}/${stem}.png`, {
				body: await readFile(jackets[i] as string),
				type: "image/png",
			});
		}
		files.set(`music/${stem}.ogg`, {
			body: await readFile(join(src, s.music as string)),
			type: "audio/ogg",
		});
	}
	manifest.push({
		id,
		stem,
		song: name,
		composer,
		illustrator,
		gone: s.gone,
		jacket,
		charts,
	});
}
files.set("index.json", {
	body: Buffer.from(
		`${JSON.stringify({ v: 1, songs: manifest }, null, "\t")}\n`,
	),
	type: "application/json",
});

let bytes = 0;
for (const [name, { body }] of files) {
	const path = join(out, REMOVED_PREFIX, name);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, body);
	bytes += body.byteLength;
}
console.log(
	`${files.size} files, ${bytes} bytes under ${join(out, REMOVED_PREFIX)}`,
);

if (upload) {
	await uploadTree(
		REMOVED_PREFIX,
		[...files].filter(([name]) =>
			name === "index.json" ? !skipManifest : !manifestOnly,
		),
	);
}
