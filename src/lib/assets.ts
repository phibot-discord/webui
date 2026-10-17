import { bareId, type PackLevelName, packLevelName } from "./chart-catalog";

/** April Fools specials: a copy of the normal tree (`4-1/original_ill/…`, `4-1/phira/…`) plus `4-1/index.json` */
export const FOOLS_PREFIX = "4-1";
/** Songs and charts later versions dropped: the normal layout under `removed/`, plus `removed/index.json` */
export const REMOVED_PREFIX = "removed";
/** Older revisions of current charts: `history/<apk>/…` per APK, plus `history/index.json` */
export const HISTORY_PREFIX = "history";
/** Trees that scripts write and the ripper never touches, each on a files-page tab; history nests one per APK */
export const SIDE_TREES = [
	{ tab: "fools", prefix: FOOLS_PREFIX, perApk: false },
	{ tab: "removed", prefix: REMOVED_PREFIX, perApk: false },
	{ tab: "history", prefix: HISTORY_PREFIX, perApk: true },
] as const;
export type SideTab = (typeof SIDE_TREES)[number]["tab"];
/** The side trees that hold their own jackets, routed by `getill` */
export const JACKET_TREES = ["fools", "removed"] as const satisfies SideTab[];
export type JacketTree = (typeof JACKET_TREES)[number];

export function sidePrefix(tab: SideTab): string {
	return SIDE_TREES.find((tree) => tree.tab === tab)?.prefix ?? tab;
}
/** The side trees' jacket directory, whatever CLOUDFLARE_R2_ILL_PREFIX the main tree uses */
export const SIDE_ILL_DIR = "original_ill";

/** ponytail: public trees only. Add a prefix when a new public tree lands in the bucket */
export const PUBLIC_ASSET_PREFIXES = [
	"original_ill/",
	"html/avatar/",
	"html/otherimg/",
	"info/",
	"phira/",
	"chart/",
	"music/",
	"pv/",
	"collection/",
	"collection-art/",
	"c9s6/",
	...SIDE_TREES.map((tree) => `${tree.prefix}/`),
];

/** Trees pages link to that the files page does not list; their links get `?v=` too */
export const LINKED_PREFIXES = ["texts/", "deduction/"];

const IN_PLACE_PREFIXES = ["tips/", "_sync/", "collection/", "web-cards/"];

/** Data that changes in place (Cache Rule 3 in scripts/r2-registry.json): the server reads it through the API */
export function changesInPlace(key: string): boolean {
	const k = key.replace(/^\//, "");
	if (/(^|\/)(index|specials|levels)\.json$/.test(k)) return true;
	if (k.startsWith("info/")) return !k.startsWith("info/oldInfo/");
	if (/^texts\/[^/]+\.json$/.test(k)) return true;
	return IN_PLACE_PREFIXES.some((prefix) => k.startsWith(prefix));
}

const KINDS = {
	jacket: "original_ill/ill/",
	low: "original_ill/illLow/",
	blur: "original_ill/illBlur/",
	chart: "phira/",
	json: "chart/",
	music: "music/",
	video: "pv/",
	avatar: "html/avatar/",
	info: "info/",
	collection: "collection/",
	art: "collection-art/",
	hidden: "c9s6/",
} as const;

export type AssetKind = keyof typeof KINDS | "other";
/** `v` is the short etag a link carries as `?v=`, so it changes exactly when the file does */
export type AssetFile = { key: string; size: number; v?: string };

const TEXT_EXT = new Set(["txt", "csv", "json", "yaml", "yml", "md"]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export const ASSET_KINDS = [
	"all",
	"jacket",
	"low",
	"blur",
	"chart",
	"json",
	"music",
	"video",
	"avatar",
	"info",
	"collection",
	"art",
	"hidden",
	"other",
] as const;

export type AssetFilter = (typeof ASSET_KINDS)[number];

export function isPublicAssetKey(key: string): boolean {
	if (key.length === 0 || key.length > 512) return false;
	if (key.includes("\\") || key.includes("\0") || key.startsWith("/"))
		return false;
	const parts = key.split("/");
	if (parts.some((part) => part === "" || part === "." || part === ".."))
		return false;
	return PUBLIC_ASSET_PREFIXES.some(
		(prefix) => key.startsWith(prefix) && key.length > prefix.length,
	);
}

/** The files page keeps each side tree on a tab of its own, apart from the game's files */
export type AssetTab = "files" | SideTab;
export const ASSET_TABS: readonly AssetTab[] = [
	"files",
	...SIDE_TREES.map((tree) => tree.tab),
];

const SIDE_ROOTS = SIDE_TREES.map((tree) => ({
	tab: tree.tab,
	root: new RegExp(`^${tree.prefix}/${tree.perApk ? "(?:[\\d.]+/)?" : ""}`),
}));

function sideRoot(key: string): { tab: SideTab; root: string } | undefined {
	for (const { tab, root } of SIDE_ROOTS) {
		const hit = root.exec(key)?.[0];
		if (hit) return { tab, root: hit };
	}
	return undefined;
}

export function assetTab(key: string): AssetTab {
	return sideRoot(key)?.tab ?? "files";
}

/** `4-1/phira/IN/a.pez` → `["4-1/", "phira/IN/a.pez"]`; `history/<apk>/` is one root */
export function splitTree(key: string): [root: string, rest: string] {
	const side = sideRoot(key);
	return side ? [side.root, key.slice(side.root.length)] : ["", key];
}

export function assetKind(key: string): AssetKind {
	const rest = splitTree(key)[1];
	for (const [kind, prefix] of Object.entries(KINDS) as [
		Exclude<AssetKind, "other">,
		string,
	][]) {
		if (!rest.startsWith(prefix)) continue;
		return kind !== "video" || assetExt(key) === "mp4" ? kind : "other";
	}
	return "other";
}

export function assetExt(key: string): string {
	const file = key.split("/").pop() ?? "";
	const dot = file.lastIndexOf(".");
	return dot >= 0 ? file.slice(dot + 1).toLowerCase() : "";
}

export function assetContentType(key: string): string {
	switch (assetExt(key)) {
		case "png":
			return "image/png";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "webp":
			return "image/webp";
		case "gif":
			return "image/gif";
		case "json":
			return "application/json; charset=utf-8";
		case "txt":
		case "csv":
		case "yaml":
		case "yml":
		case "md":
			return "text/plain; charset=utf-8";
		case "ogg":
			return "audio/ogg";
		case "mp4":
			return "video/mp4";
		default:
			return "application/octet-stream";
	}
}

export function formatSize(size: number): string {
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function assetCanPreview(
	key: string,
): "image" | "text" | "audio" | "video" | false {
	const ext = assetExt(key);
	if (IMAGE_EXT.has(ext)) return "image";
	if (TEXT_EXT.has(ext)) return "text";
	if (ext === "ogg") return "audio";
	if (ext === "mp4") return "video";
	return false;
}

export function publicAssetUrl(
	base: string,
	key: string,
	version?: string,
): string {
	const root = base.replace(/\/+$/, "");
	const path = key
		.replace(/^\//, "")
		.split("/")
		.map(encodeURIComponent)
		.join("/");
	return `${root}/${path}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
}

export function assetDisposition(key: string, download: boolean): string {
	const file = key.split("/").pop() || "file";
	const ascii = file.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "");
	const mode = download || !assetCanPreview(key) ? "attachment" : "inline";
	return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file)}`;
}

/** Low-res jacket when one exists, so a result row does not pull the full illustration (music shows its song's) */
export function assetThumbKey(key: string): string {
	const [root, rest] = splitTree(key);
	if (rest.startsWith("original_ill/ill/"))
		return `${root}original_ill/illLow/${rest.slice("original_ill/ill/".length)}`;
	if (rest.startsWith("original_ill/illBlur/"))
		return `${root}original_ill/illLow/${rest.slice("original_ill/illBlur/".length)}`;
	if (rest.startsWith("music/"))
		return `${root}original_ill/illLow/${rest.slice("music/".length).replace(/\.ogg$/, ".png")}`;
	if (rest.startsWith("collection-art/") && !rest.endsWith("-tile.png"))
		return `${root}${rest.replace(/\.png$/, ".jpg")}`;
	return key;
}

export function readAssetPage(
	body: unknown,
	keep: (key: string) => boolean = isPublicAssetKey,
): {
	files: AssetFile[];
	cursor?: string;
} {
	if (!body || typeof body !== "object") return { files: [] };
	const rec = body as {
		result?: unknown;
		result_info?: { cursor?: unknown; is_truncated?: unknown };
	};
	const files: AssetFile[] = [];
	if (Array.isArray(rec.result)) {
		for (const row of rec.result) {
			if (!row || typeof row !== "object") continue;
			const key = (row as { key?: unknown }).key;
			const size = (row as { size?: unknown }).size;
			const etag = (row as { etag?: unknown }).etag;
			if (typeof key !== "string" || !keep(key)) continue;
			const v =
				typeof etag === "string"
					? etag
							.replace(/[^0-9a-f]/gi, "")
							.slice(0, 12)
							.toLowerCase()
					: "";
			files.push({
				key,
				size:
					typeof size === "number" && Number.isFinite(size) && size >= 0
						? size
						: 0,
				...(v.length >= 8 ? { v } : {}),
			});
		}
	}
	const info = rec.result_info;
	const cursor =
		info?.is_truncated === true && typeof info.cursor === "string"
			? info.cursor
			: undefined;
	return { files, cursor };
}

/** `phira/EZ_Error/<id>-EZ_Error.pez` → the song stem, its level and the level folder; other files: none */
export function packOf(
	key: string,
): { stem: string; level: PackLevelName; folder: string } | undefined {
	const [dir, level = "", file = "", ...more] = splitTree(key)[1].split("/");
	const name = packLevelName(level);
	const suffix = `-${level}.pez`;
	if (dir !== "phira" || more.length || !name || !file.endsWith(suffix)) {
		return undefined;
	}
	const stem = file.slice(0, -suffix.length);
	return stem ? { stem, level: name, folder: level } : undefined;
}

/** `chart/<id>.0/<LEVEL>.json` → the song id stem and its level; other files have none */
export function chartJsonOf(
	key: string,
): { stem: string; level: PackLevelName } | undefined {
	const [dir, folder = "", file = "", ...more] = splitTree(key)[1].split("/");
	const level = file.endsWith(".json") ? file.slice(0, -".json".length) : "";
	const name = packLevelName(level);
	if (dir !== "chart" || more.length || !folder || !name) return undefined;
	return { stem: bareId(folder), level: name };
}
