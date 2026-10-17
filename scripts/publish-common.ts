// Helpers shared by the publish-* scripts
import { poolAll } from "../src/server/pool";

type Note = { type: number };
type Line = { notesAbove?: Note[]; notesBelow?: Note[] };

export function countNotes(chart: { judgeLineList?: Line[] }): number {
	let n = 0;
	for (const line of chart.judgeLineList ?? []) {
		n += (line.notesAbove?.length ?? 0) + (line.notesBelow?.length ?? 0);
	}
	return n;
}

/** info.txt is one field per line */
export const oneLine = (s: string | null | undefined) =>
	(s ?? "").replace(/\s*\n\s*/g, " ").trim();

export const publicBase = (
	process.env.CLOUDFLARE_R2_PUBLIC_BASE || "https://r2.phiapi.miyuki-yue.dev"
).replace(/\/$/, "");

export async function fetchPublic(key: string, agent: string): Promise<Buffer> {
	const res = await fetch(
		`${publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`,
		{ headers: { "User-Agent": `Mozilla/5.0 ${agent}` } },
	);
	if (!res.ok) throw new Error(`${key}: ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

type TreeFile = { body: Uint8Array; type: string };

export async function uploadTree(
	prefix: string,
	entries: [string, TreeFile][],
) {
	const { putR2Object, r2WriteReady } = await import("../src/server/r2");
	if (!r2WriteReady()) throw new Error("R2 write is not configured");
	const put = async ([name, file]: [string, TreeFile]) => {
		const key = `${prefix}/${name}`;
		// 15 min, not cfFetch's 12 s: a pack on a slow uplink takes longer
		await putR2Object(key, Buffer.from(file.body), file.type, {
			cache: "no-store",
			timeoutMs: 15 * 60 * 1000,
		});
		console.log(`uploaded ${key}`);
	};
	const isIndex = ([name]: [string, TreeFile]) => name === "index.json";
	await poolAll(
		entries.filter((entry) => !isIndex(entry)),
		4,
		put,
	);
	// The manifest goes last: the site only lists what it names
	for (const entry of entries.filter(isIndex)) await put(entry);
}
