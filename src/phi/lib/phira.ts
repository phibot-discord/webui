import JSZip from "jszip";

/** SP only exists for the 4/1 specials (see src/server/fools.ts) */
export const PHIRA_LEVELS = ["EZ", "HD", "IN", "AT", "SP"] as const;
export type PhiraLevel = (typeof PHIRA_LEVELS)[number];

const FIXED_DATE = new Date(Date.UTC(2025, 0, 1));

export function phiraInfoText(info: {
	id: string;
	name: string;
	level: string;
	difficulty: string;
	composer: string;
	illustrator: string;
	charter: string;
}) {
	return (
		`#\nName: ${info.name}\nSong: ${info.id}.ogg\nPicture: ${info.id}.png\n` +
		`Chart: ${info.id}.json\nLevel: ${info.level} Lv.${info.difficulty}\n` +
		`Composer: ${info.composer}\nIllustrator: ${info.illustrator}\n` +
		`Charter: ${info.charter}`
	);
}

export function isPhiraLevel(v: string): v is PhiraLevel {
	return (PHIRA_LEVELS as readonly string[]).includes(v);
}

/** `<id without .0>-<level>.pez` */
export function phiraPackFile(id: string, level: PhiraLevel): string {
	return `${id.replace(/\.0$/, "")}-${level}.pez`;
}

/** R2 key of a Phira pack; `root` is a key prefix such as FOOLS_PREFIX for the 4/1 specials */
export function phiraPackKey(id: string, level: PhiraLevel, root = ""): string {
	return `${root ? `${root}/` : ""}phira/${level}/${phiraPackFile(id, level)}`;
}

export async function packPhiraChart(input: {
	id: string;
	name: string;
	level: string;
	difficulty: string;
	composer: string;
	illustrator: string;
	charter: string;
	chart: Uint8Array | string;
	picture: Uint8Array;
	song: Uint8Array;
}): Promise<Uint8Array> {
	const zip = new JSZip();
	zip.file("info.txt", phiraInfoText(input), {
		date: FIXED_DATE,
		compression: "DEFLATE",
	});
	zip.file(`${input.id}.json`, input.chart, {
		date: FIXED_DATE,
		compression: "DEFLATE",
	});
	zip.file(`${input.id}.png`, input.picture, {
		date: FIXED_DATE,
		compression: "STORE",
	});
	zip.file(`${input.id}.ogg`, input.song, {
		date: FIXED_DATE,
		compression: "STORE",
	});
	return zip.generateAsync({ type: "uint8array" });
}
