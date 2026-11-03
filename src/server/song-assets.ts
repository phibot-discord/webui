import {
	type AssetFile,
	chartJsonOf,
	FOOLS_PREFIX,
	HISTORY_PREFIX,
	packOf,
	REMOVED_PREFIX,
	SIDE_ILL_DIR,
	splitTree,
} from "@/lib/assets";
import { bareId, CHART_LEVELS } from "@/lib/chart-catalog";
import type { ObjectUrl } from "./asset-links";
import { publicFiles } from "./assets";
import { loadFools } from "./fools";
import type { SongHistory } from "./history";
import { loadRemoved } from "./removed";
import { withTimeout } from "./render-lock";

export type Tree = "current" | "history" | "removed" | "fools";

export type SongFile = { key: string; url: string; size: number; name: string };

export type PreviewSource = {
	chart: string;
	pack: boolean;
	music?: string;
	cover?: string;
};

export type PreviewVersion = {
	id: string;
	tree: Tree;
	rev?: string;
	versions?: string[];
	levels: { rank: string; source: PreviewSource; from?: string }[];
};

export type ArtFile = SongFile & {
	tree: Tree;
	variant: "ill" | "illLow" | "illBlur" | "SP";
	level?: string;
};

export type ChartFiles = {
	id: string;
	tree: Tree;
	rev?: string;
	versions?: string[];
	levels: { rank: string; json?: SongFile; pack?: SongFile }[];
};

export type SongAssets = {
	preview: PreviewVersion[];
	music: (SongFile & { tree: Tree })[];
	art: ArtFile[];
	charts: ChartFiles[];
};

type Parsed =
	| { what: "json" | "pack"; level: string }
	| { what: "music" }
	| { what: "art"; variant: ArtFile["variant"]; level?: string };

const ART_DIRS = new Set(["ill", "illLow", "illBlur"]);
const LIST_WAIT_MS = 2000;

function treeOf(root: string): { tree: Tree; rev?: string } {
	if (!root) return { tree: "current" };
	if (root === `${REMOVED_PREFIX}/`) return { tree: "removed" };
	if (root === `${FOOLS_PREFIX}/`) return { tree: "fools" };
	const rev = root.slice(HISTORY_PREFIX.length + 1, -1);
	return { tree: "history", ...(rev ? { rev } : {}) };
}

function parse(key: string, stems: ReadonlySet<string>): Parsed | undefined {
	const json = chartJsonOf(key);
	if (json) {
		return stems.has(json.stem) || stems.has(bareId(json.stem))
			? {
					what: "json",
					level: (key.split("/").at(-1) ?? "").replace(/\.json$/, ""),
				}
			: undefined;
	}
	const pack = packOf(key);
	if (pack) {
		return stems.has(pack.stem)
			? { what: "pack", level: pack.folder }
			: undefined;
	}
	const rest = splitTree(key)[1];
	const parts = rest.split("/");
	const file = parts.at(-1) ?? "";
	const dot = file.lastIndexOf(".");
	const stem = dot > 0 ? file.slice(0, dot) : file;
	if (!stems.has(stem)) return undefined;
	if (parts[0] === "music" && parts.length === 2) return { what: "music" };
	if (parts[0] === SIDE_ILL_DIR || parts[0] === "original_ill") {
		const dir = parts[1] ?? "";
		if (dir === "SP" && parts.length === 3)
			return { what: "art", variant: "SP" };
		if (ART_DIRS.has(dir) && parts.length === 3) {
			return { what: "art", variant: dir as ArtFile["variant"] };
		}
		if (ART_DIRS.has(dir) && parts.length === 4) {
			return {
				what: "art",
				variant: dir as ArtFile["variant"],
				level: parts[2],
			};
		}
	}
	return undefined;
}

function keyStems(key: string): string[] {
	const json = chartJsonOf(key);
	if (json) return [json.stem, bareId(json.stem)];
	const pack = packOf(key);
	if (pack) return [pack.stem];
	const file = key.split("/").at(-1) ?? "";
	const dot = file.lastIndexOf(".");
	return [dot > 0 ? file.slice(0, dot) : file];
}

type StemIndex = { files: AssetFile[]; at: Map<string, number[]> };

const stemIndexes = new WeakMap<ReadonlyMap<string, AssetFile>, StemIndex>();

function stemIndex(listing: ReadonlyMap<string, AssetFile>): StemIndex {
	const hit = stemIndexes.get(listing);
	if (hit) return hit;
	const files = [...listing.values()];
	const at = new Map<string, number[]>();
	files.forEach((file, i) => {
		for (const stem of new Set(keyStems(file.key))) {
			const list = at.get(stem);
			if (list) list.push(i);
			else at.set(stem, [i]);
		}
	});
	const index = { files, at };
	stemIndexes.set(listing, index);
	return index;
}

function filesOf(
	listing: ReadonlyMap<string, AssetFile>,
	stems: ReadonlySet<string>,
): AssetFile[] {
	const { files, at } = stemIndex(listing);
	const picked = new Set<number>();
	for (const stem of stems) for (const i of at.get(stem) ?? []) picked.add(i);
	return [...picked].sort((a, b) => a - b).flatMap((i) => files[i] ?? []);
}

const TREE_ORDER: Tree[] = ["current", "history", "removed", "fools"];

function levelOrder(rank: string): number {
	const base = rank.split("_")[0] ?? rank;
	const i = (CHART_LEVELS as readonly string[]).indexOf(base);
	return (i < 0 ? 10 : i) * 10 + (rank === base ? 0 : 1);
}

function versionKey(v: string): number[] {
	return v.split(/[.-]/).map((n) => Number(n) || 0);
}

function newerFirst(a?: string, b?: string): number {
	const x = versionKey(a ?? "");
	const y = versionKey(b ?? "");
	for (let i = 0; i < Math.max(x.length, y.length); i++) {
		const d = (y[i] ?? 0) - (x[i] ?? 0);
		if (d) return d;
	}
	return 0;
}

export function collectSongAssets(
	files: Iterable<AssetFile>,
	stems: ReadonlySet<string>,
	link: ObjectUrl,
	opts: {
		history?: Pick<SongHistory, "eras">;
		removedFrom?: Record<string, string>;
	} = {},
): SongAssets {
	const music: SongAssets["music"] = [];
	const art: ArtFile[] = [];
	const groups = new Map<string, ChartFiles>();
	const musicOf = new Map<Tree, string>();
	for (const file of files) {
		const parsed = parse(file.key, stems);
		if (!parsed) continue;
		const url = link(file.key);
		if (!url) continue;
		const [root] = splitTree(file.key);
		const { tree, rev } = treeOf(root);
		const base = file.key.split("/").at(-1) ?? file.key;
		const tag = rev ? `-v${rev}` : tree === "current" ? "" : `-${tree}`;
		const name =
			parsed.what === "json"
				? `${file.key.split("/").at(-2)}-${base.replace(/\.json$/, "")}${tag}.json`
				: parsed.what === "pack"
					? base.replace(/\.pez$/, `${tag}.pez`)
					: parsed.what === "art"
						? `${base.replace(/\.png$/, "")}${parsed.level ? `-${parsed.level}` : ""}-${parsed.variant}${tag}.png`
						: base.replace(/(\.[^.]+)$/, `${tag}$1`);
		const entry: SongFile = { key: file.key, url, size: file.size, name };
		if (parsed.what === "music") {
			music.push({ ...entry, tree });
			if (!musicOf.has(tree)) musicOf.set(tree, url);
			continue;
		}
		if (parsed.what === "art") {
			art.push({
				...entry,
				tree,
				variant: parsed.variant,
				...(parsed.level ? { level: parsed.level } : {}),
			});
			continue;
		}
		const id = rev ? `${tree}:${rev}` : tree;
		let group = groups.get(id);
		if (!group) {
			const era = rev
				? opts.history?.eras.find((e) =>
						Object.values(e.charts).some((c) => c.rev === rev),
					)
				: undefined;
			group = {
				id,
				tree,
				...(rev ? { rev } : {}),
				...(era ? { versions: era.versions } : {}),
				levels: [],
			};
			groups.set(id, group);
		}
		let level = group.levels.find((l) => l.rank === parsed.level);
		if (!level) {
			level = { rank: parsed.level };
			group.levels.push(level);
		}
		level[parsed.what] = entry;
	}
	const charts = [...groups.values()]
		.map((g) => ({
			...g,
			levels: g.levels.sort((a, b) => levelOrder(a.rank) - levelOrder(b.rank)),
		}))
		.sort(
			(a, b) =>
				TREE_ORDER.indexOf(a.tree) - TREE_ORDER.indexOf(b.tree) ||
				newerFirst(a.rev, b.rev),
		);
	const coverOf = (tree: Tree, level: string): string | undefined => {
		const pick = (t: Tree, lv?: string) =>
			art.find(
				(a) =>
					a.tree === t &&
					a.variant === "illLow" &&
					(a.level ?? "") === (lv ?? ""),
			)?.url;
		const own = tree === "removed" || tree === "fools" ? tree : "current";
		return (
			pick(own, level) ??
			pick(own) ??
			pick("current", level) ??
			pick("current") ??
			art.find((a) => a.variant === "SP")?.url
		);
	};
	const preview: PreviewVersion[] = charts.flatMap((g) => {
		const songMusic =
			(g.tree === "removed" || g.tree === "fools"
				? musicOf.get(g.tree)
				: undefined) ?? musicOf.get("current");
		const levels = g.levels.flatMap((l) => {
			const file = l.json ?? (g.tree === "fools" ? l.pack : undefined);
			if (!file) return [];
			const pack = !l.json;
			const cover = coverOf(g.tree, l.rank);
			const music =
				pack && g.tree === "fools" ? musicOf.get("fools") : songMusic;
			const from =
				g.tree === "removed" ? opts.removedFrom?.[l.rank] : undefined;
			return [
				{
					rank: l.rank,
					source: {
						chart: file.url,
						pack,
						...(music ? { music } : {}),
						...(cover ? { cover } : {}),
					},
					...(from ? { from } : {}),
				},
			];
		});
		if (!levels.length) return [];
		return [
			{
				id: g.id,
				tree: g.tree,
				...(g.rev ? { rev: g.rev } : {}),
				...(g.versions ? { versions: g.versions } : {}),
				levels,
			},
		];
	});
	const artOrder = { ill: 0, illLow: 1, illBlur: 2, SP: 3 };
	art.sort(
		(a, b) =>
			TREE_ORDER.indexOf(a.tree) - TREE_ORDER.indexOf(b.tree) ||
			(a.level ? levelOrder(a.level) : -1) -
				(b.level ? levelOrder(b.level) : -1) ||
			artOrder[a.variant] - artOrder[b.variant],
	);
	music.sort((a, b) => TREE_ORDER.indexOf(a.tree) - TREE_ORDER.indexOf(b.tree));
	return { preview, music, art, charts };
}

export async function songAssets(
	id: string,
	link: ObjectUrl,
	historyJob?: Promise<Pick<SongHistory, "eras" | "stem"> | undefined>,
): Promise<SongAssets> {
	const [files, removed, fools, history] = await Promise.all([
		withTimeout(publicFiles(), LIST_WAIT_MS, "song listing").catch(
			() => new Map<string, AssetFile>(),
		),
		loadRemoved().catch(() => []),
		loadFools().catch(() => []),
		historyJob,
	]);
	const bare = bareId(id);
	const removedSong = removed.find((s) => bareId(s.id) === bare);
	const foolsSong = fools.find((s) => bareId(s.id) === bare);
	const stems = new Set(
		[bare, removedSong?.stem, foolsSong?.stem, history?.stem].filter(
			(s): s is string => Boolean(s),
		),
	);
	const removedFrom = removedSong
		? Object.fromEntries(
				Object.entries(removedSong.charts).map(([lv, c]) => [lv, c.from]),
			)
		: undefined;
	return collectSongAssets(filesOf(files, stems), stems, link, {
		...(history ? { history } : {}),
		...(removedFrom ? { removedFrom } : {}),
	});
}
