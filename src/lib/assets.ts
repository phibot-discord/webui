/** ponytail: public trees only. Add a prefix when a new public tree lands in the bucket */
export const PUBLIC_ASSET_PREFIXES = [
	"original_ill/",
	"html/avatar/",
	"html/otherimg/",
	"info/",
	"phira/",
	"music/",
] as const;

const KINDS = {
	jacket: "original_ill/ill/",
	low: "original_ill/illLow/",
	blur: "original_ill/illBlur/",
	chart: "phira/",
	music: "music/",
	avatar: "html/avatar/",
	info: "info/",
} as const;

export type AssetKind = keyof typeof KINDS | "other";
export type AssetFile = { key: string; size: number };

const TEXT_EXT = new Set(["txt", "csv", "json", "yaml", "yml", "md"]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export const ASSET_KINDS = [
	"all",
	"jacket",
	"low",
	"blur",
	"chart",
	"music",
	"avatar",
	"info",
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

export function assetKind(key: string): AssetKind {
	for (const [kind, prefix] of Object.entries(KINDS) as [
		Exclude<AssetKind, "other">,
		string,
	][]) {
		if (key.startsWith(prefix)) return kind;
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
		default:
			return "application/octet-stream";
	}
}

export function assetCanPreview(
	key: string,
): "image" | "text" | "audio" | false {
	const ext = assetExt(key);
	if (IMAGE_EXT.has(ext)) return "image";
	if (TEXT_EXT.has(ext)) return "text";
	if (ext === "ogg") return "audio";
	return false;
}

export function publicAssetUrl(base: string, key: string): string {
	const root = base.replace(/\/+$/, "");
	const path = key
		.replace(/^\//, "")
		.split("/")
		.map(encodeURIComponent)
		.join("/");
	return `${root}/${path}`;
}

export function assetDisposition(key: string, download: boolean): string {
	const file = key.split("/").pop() || "file";
	const ascii = file.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
	const mode = download || !assetCanPreview(key) ? "attachment" : "inline";
	return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file)}`;
}

/** Low-res jacket when one exists, so a result row does not pull the full illustration (music shows its song's) */
export function assetThumbKey(key: string): string {
	if (key.startsWith("original_ill/ill/"))
		return `original_ill/illLow/${key.slice("original_ill/ill/".length)}`;
	if (key.startsWith("original_ill/illBlur/"))
		return `original_ill/illLow/${key.slice("original_ill/illBlur/".length)}`;
	if (key.startsWith("music/"))
		return `original_ill/illLow/${key.slice("music/".length).replace(/\.ogg$/, ".png")}`;
	return key;
}

export function readAssetPage(body: unknown): {
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
			if (typeof key !== "string" || !isPublicAssetKey(key)) continue;
			files.push({
				key,
				size:
					typeof size === "number" && Number.isFinite(size) && size >= 0
						? size
						: 0,
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
