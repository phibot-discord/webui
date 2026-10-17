// Builds the 4/1 specials' R2 tree (`4-1/…`) from unpacked APKs; nothing is uploaded without --upload
//   node --env-file=.env.local --import tsx scripts/publish-fools.ts <unpack root> <out dir> [--upload [--no-manifest|--manifest-only|--only=<keys> [--manifest]]]
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { PhiraLevel } from "../src/phi/lib/phira";
import { countNotes, oneLine, uploadTree } from "./publish-common";

type Special = {
	key: string;
	apk: string;
	folder: string;
	charts: Record<string, { file: string; spinfo: string }>;
	fallback?: SpSong;
	override?: Pick<SpSong, "composer" | "illustrator">;
};

// Every special is published as SP, whichever level the game files it under
const SPECIALS: Special[] = [
	{
		key: "Christmas",
		apk: "1.2.4",
		folder: "Christmas.0",
		charts: { SP: { file: "SP", spinfo: "圣诞快乐" } },
		override: { illustrator: "鲸弑" },
	},
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
		key: "HAZARD (April Fools)",
		apk: "2.1.4",
		folder: "HAZARD.AprilFools.0",
		charts: { SP: { file: "Chart", spinfo: "SP" } },
		fallback: {
			song: "HAZARD (April Fools)",
			composer: "Limpid",
			illustrator: "ZG",
			chart: { SP: { combo: "541", charter: "Gausbon" } },
		},
	},
	{
		key: "Retribution ~ Cycle of Redemption ~",
		apk: "3.5.2",
		folder: "Retribution.nmyKryexe.1",
		charts: { SP: { file: "IN", spinfo: "?!" } },
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
const { SIDE_ILL_DIR, FOOLS_PREFIX } = await import("../src/lib/assets");

const spinfo = JSON.parse(
	await readFile(join("phi-assets", "info", "spinfo.json"), "utf8"),
) as Record<string, SpSong>;

/** `special` is the key of the special a file belongs to; index.json has none */
const files = new Map<
	string,
	{ body: Uint8Array; type: string; special?: string }
>();
const manifest: unknown[] = [];

for (const special of SPECIALS) {
	const found = spinfo[special.key] ?? special.fallback;
	const sp = found && { ...found, ...special.override };
	if (!sp?.song) throw new Error(`${special.key} is not in spinfo.json`);
	const id = `${special.key}.0`;
	const track = (...parts: string[]) => join(src, special.apk, ...parts);
	const stem = special.folder.replace(/\.0$/, "");
	const jackets = ["ill", "illLow", "illBlur"].map((dir) =>
		track("original_ill", dir, `${stem}.png`),
	);
	const jacket = jackets.every((p) => existsSync(p));
	// The pack's in-game background: the low-res jacket like the ripper's packs, else whichever one there is
	const pictureFile = [jackets[1], jackets[0], jackets[2]].find(
		(p): p is string => !!p && existsSync(p),
	);
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
			id: stem,
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
		files.set(phiraPackKey(stem, level as PhiraLevel), {
			body: pack,
			type: "application/octet-stream",
			special: special.key,
		});
		charts[level] = { label, charter: meta.charter ?? "", notes };
	}
	if (jacket) {
		for (const [i, dir] of ["ill", "illLow", "illBlur"].entries()) {
			files.set(`${SIDE_ILL_DIR}/${dir}/${stem}.png`, {
				body: await readFile(jackets[i] as string),
				type: "image/png",
				special: special.key,
			});
		}
	}
	files.set(`music/${stem}.ogg`, {
		body: song,
		type: "audio/ogg",
		special: special.key,
	});
	manifest.push({
		id,
		stem,
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
	// index.json names every special, so with --only it waits for --manifest: a listed special without its pack 404s
	const sendManifest = !skipManifest && (!only || withManifest);
	await uploadTree(
		FOOLS_PREFIX,
		[...files].filter(([name, { special }]) => {
			if (name === "index.json") return sendManifest;
			return !manifestOnly && (!only || (!!special && only.has(special)));
		}),
	);
	if (only && !sendManifest) {
		console.log(
			"index.json not sent: once every special's files are up, send it with --upload --manifest-only",
		);
	}
}
