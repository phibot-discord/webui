// Builds the April Fools (4/1) specials' R2 tree (`4-1/…`, read by src/server/fools.ts) from unpacked APKs
//   node --env-file=.env.local --import tsx scripts/publish-fools.ts <unpack root> <out dir> [--upload [flags]]
// <unpack root>/<apk>/ is a phi-unpackd-style export of the APK a special shipped in (chart/<folder>/<FILE>.json,
// original_ill/{ill,illLow,illBlur}/<id>.png, music/<id>.ogg, where <id> is <folder> without a trailing `.0`);
// <out dir> receives the tree. Song details come from phi-assets/info/spinfo.json (or the special's own
// `fallback`), and every chart's note count must match the combo there. Without --upload nothing leaves this
// machine. Upload flags: --no-manifest sends everything but index.json, which is what the site follows;
// --manifest-only sends just that; --only=<key>[,<key>…] sends those specials' files (exact keys), and
// index.json only with --manifest, so the site never lists a pack that is not up yet; a run that stops partway
// resumes with --only=<the keys not yet up>. Every special in SPECIALS must be unpacked: the manifest is
// rebuilt from the whole list
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { PhiraLevel } from "../src/phi/lib/phira";

type Special = {
	/** spinfo.json key; with `.0` it is the catalog id, and R2 files are named after it */
	key: string;
	/** Which APK's export holds it, and the track folder in there */
	apk: string;
	folder: string;
	/** Published level → the chart's file in `chart/<folder>/` and its key in spinfo.json (the joke name) */
	charts: Record<string, { file: string; spinfo: string }>;
	/** The entry phi-plugin dropped from spinfo.json once the song joined the game for good */
	fallback?: SpSong;
};

// Every special is published as SP, whichever level the game files it under
const SPECIALS: Special[] = [
	{
		key: "Burn(Haocore Mix)",
		apk: "1.4.1",
		folder: "BurnHaocoreMix.0",
		charts: { SP: { file: "SP", spinfo: "禁烟先锋" } },
	},
	{
		key: "Spasmodic(Haocore Mix)",
		apk: "1.6.5",
		folder: "SpasmodicHaocoreRemix.0",
		charts: { SP: { file: "SP", spinfo: "一库呦" } },
	},
	{
		key: "Sigma (Haocore Mix) ~ 105秒の伝説 ~",
		apk: "2.1.4",
		folder: "Sigma.AprilFools.0",
		charts: { SP: { file: "Chart", spinfo: "嘿！" } },
	},
	{
		key: "Sigma (Haocore Mix) ~ Regrets of The Yellow Tulip ~",
		apk: "2.1.4",
		folder: "Sigma.AprilFools.1",
		charts: { SP: { file: "Chart", spinfo: "踏平星空" } },
	},
	{
		key: "今年も「雪降り、メリクリ」目指して頑張ります！！",
		apk: "2.5.1",
		folder: "雪降りメリクリ.1",
		charts: { SP: { file: "IN", spinfo: "lN" } },
	},
	{
		key: "Dlyrotz -SUPER ULTIMATE AMAZING AWESOME PRO MAX EXTRA REMIX-",
		apk: "3.12.0",
		folder: "Dlyrotz.Likey.1",
		charts: { SP: { file: "IN", spinfo: "听采样吧" } },
	},
	{
		key: "OblivionPHIN.Daily天利vsEndCat终猫ftAiSSw夜輪",
		apk: "3.19.0.1",
		folder: "OblivionPHIN.Daily天利vsEndCat终猫ftAiSSw夜輪.0",
		charts: { SP: { file: "IN", spinfo: "测测你的" } },
	},
	{
		key: "Retribution ~ Cycle of Redemption ~",
		apk: "3.5.2",
		folder: "Retribution.nmyKryexe.1",
		charts: { SP: { file: "IN", spinfo: "?!" } },
		// phi-plugin 69086a2d^:resources/info/spinfo.json (before "报应SP合并")
		fallback: {
			song: "Retribution ~ Cycle of Redemption ~",
			composer: "Ardolf vs. 天利",
			illustrator: "死と花の大祭司(ʌᴉoƨმᴉϝ);;",
			chart: {
				"?!": {
					combo: "2500",
					charter: "SPΔDE ~what awaits ahead is destruction and destruction~",
				},
			},
		},
	},
];

type SpChart = { level?: string; charter?: string; combo?: string };
type SpSong = {
	song?: string;
	composer?: string;
	illustrator?: string;
	chart?: Record<string, SpChart>;
};
type Note = { type: number };
type Line = { notesAbove?: Note[]; notesBelow?: Note[] };

const args = process.argv.slice(2);
const [srcArg, outArg] = args.filter((a) => !a.startsWith("--"));
if (!srcArg || !outArg) {
	console.error("usage: publish-fools.ts <unpack dir> <out dir> [--upload]");
	process.exit(1);
}
const src = resolve(srcArg);
const out = resolve(outArg);
const upload = args.includes("--upload");
const skipManifest = args.includes("--no-manifest");
const manifestOnly = args.includes("--manifest-only");
const withManifest = args.includes("--manifest");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg
	? new Set(
			onlyArg
				.slice("--only=".length)
				.split(",")
				.map((key) => key.trim())
				.filter(Boolean),
		)
	: undefined;
if (only) {
	const unknown = [...only].filter(
		(key) => !SPECIALS.some((s) => s.key === key),
	);
	if (!only.size || unknown.length) {
		console.error(
			`--only: ${unknown.length ? `no special ${unknown.map((k) => JSON.stringify(k)).join(", ")}` : "no key given"}; the keys are:\n${SPECIALS.map((s) => `  ${s.key}`).join("\n")}`,
		);
		process.exit(1);
	}
}
if (only && manifestOnly) {
	console.error("--manifest-only does not go with --only");
	process.exit(1);
}
if (withManifest && skipManifest) {
	console.error("--manifest does not go with --no-manifest");
	process.exit(1);
}

const { packPhiraChart, phiraPackKey } = await import("../src/phi/lib/phira");
const { FOOLS_ILL_DIR, FOOLS_PREFIX } = await import("../src/lib/assets");

const spinfo = JSON.parse(
	await readFile(join("phi-assets", "info", "spinfo.json"), "utf8"),
) as Record<string, SpSong>;

/** info.txt is one field per line */
const oneLine = (s: string | undefined) => (s ?? "").replace(/\s*\n\s*/g, " ");

function countNotes(chart: { judgeLineList?: Line[] }): number {
	let n = 0;
	for (const line of chart.judgeLineList ?? []) {
		n += (line.notesAbove?.length ?? 0) + (line.notesBelow?.length ?? 0);
	}
	return n;
}

/** `special` is the key of the special a file belongs to; index.json has none */
const files = new Map<
	string,
	{ body: Uint8Array; type: string; special?: string }
>();
const manifest: unknown[] = [];

for (const special of SPECIALS) {
	const sp = spinfo[special.key] ?? special.fallback;
	if (!sp?.song) throw new Error(`${special.key} is not in spinfo.json`);
	const id = `${special.key}.0`;
	const track = (...parts: string[]) => join(src, special.apk, ...parts);
	const stem = special.folder.replace(/\.0$/, "");
	const jackets = ["ill", "illLow", "illBlur"].map((dir) =>
		track("original_ill", dir, `${stem}.png`),
	);
	const jacket = jackets.every((p) => existsSync(p));
	// The pack's in-game background: the full-size jacket, else the best one there is
	const pictureFile = jackets.find((p) => existsSync(p));
	if (!pictureFile) {
		throw new Error(
			`${special.key} has no jacket: tried ${jackets.join(", ")}`,
		);
	}
	const picture = await readFile(pictureFile);
	const song = await readFile(track("music", `${stem}.ogg`));
	const charts: Record<string, unknown> = {};
	for (const [level, source] of Object.entries(special.charts)) {
		const meta = sp.chart?.[source.spinfo];
		if (!meta) {
			throw new Error(`${special.key} has no spinfo chart ${source.spinfo}`);
		}
		const chart = await readFile(
			track("chart", special.folder, `${source.file}.json`),
		);
		const notes = countNotes(JSON.parse(chart.toString("utf8")));
		if (meta.combo && Number(meta.combo) !== notes) {
			throw new Error(
				`${special.key} ${level}: chart has ${notes} notes, spinfo says ${meta.combo}`,
			);
		}
		const label = meta.level?.trim() || "?";
		const pack = await packPhiraChart({
			id: special.key,
			name: oneLine(sp.song),
			level,
			difficulty: label,
			composer: oneLine(sp.composer),
			illustrator: oneLine(sp.illustrator),
			charter: oneLine(meta.charter),
			chart,
			picture,
			song,
		});
		files.set(phiraPackKey(id, level as PhiraLevel), {
			body: pack,
			type: "application/octet-stream",
			special: special.key,
		});
		charts[level] = { label, charter: meta.charter ?? "", notes };
	}
	if (jacket) {
		for (const [i, dir] of ["ill", "illLow", "illBlur"].entries()) {
			files.set(`${FOOLS_ILL_DIR}/${dir}/${special.key}.png`, {
				body: await readFile(jackets[i] as string),
				type: "image/png",
				special: special.key,
			});
		}
	}
	files.set(`music/${special.key}.ogg`, {
		body: song,
		type: "audio/ogg",
		special: special.key,
	});
	manifest.push({
		id,
		song: sp.song,
		composer: sp.composer ?? "",
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

for (const [name, { body }] of files) {
	const path = join(out, FOOLS_PREFIX, name);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, body);
	console.log(`${FOOLS_PREFIX}/${name} ${body.byteLength}`);
}

if (upload) {
	const { putR2Object, r2WriteReady } = await import("../src/server/r2");
	if (!r2WriteReady()) throw new Error("R2 write is not configured");
	// index.json names every special, so with --only it waits for --manifest: a listed special without its pack 404s
	const sendManifest = !skipManifest && (!only || withManifest);
	// The manifest goes last: the site only lists what it names
	const order = [...files]
		.filter(([name, { special }]) => {
			if (name === "index.json") return sendManifest;
			return !manifestOnly && (!only || (!!special && only.has(special)));
		})
		.sort(
			([a], [b]) => Number(a === "index.json") - Number(b === "index.json"),
		);
	for (const [name, file] of order) {
		const key = `${FOOLS_PREFIX}/${name}`;
		// 15 min, not cfFetch's 12 s: a 4 MB pack on a slow uplink takes longer. No retry loop here, as
		// cfFetch already retries a dropped connection once and a 429/5xx twice, and a 4xx will not mend
		await putR2Object(key, Buffer.from(file.body), file.type, {
			cache: "no-store",
			timeoutMs: 15 * 60 * 1000,
		});
		console.log(`uploaded ${key}`);
	}
	if (only && !sendManifest) {
		console.log(
			"index.json not sent: once every special's files are up, send it with --upload --manifest-only",
		);
	}
}
