import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { exists, readFile } from "@/server/vfs";
import { logger } from "../logger";
import type { FontEntry } from "../sdk";

/** Map bundled font filenames to CSS font-family names in common.css */
export const PHI_FONT_FILES: Record<string, string> = {
	"phi.woff2": "PHI",
	"吞弥恰俊.woff2": "吞弥恰俊",
	"HIMALAYA.woff2": "HIMALAYA",
	"NotoSans-Regular.woff2": "NOTO",
	"NotoSansSymbols2.woff2": "NotoSansSymbols2",
	"NotoSansArabic.woff2": "NotoSansArabic",
	"NotoSansJP.woff2": "NotoSansJP",
	"Aldrich-Regular.woff2": "Aldrich",
	"NotoSansKannada.woff2": "NotoSansKannada",
	"NotoSansCanadianAboriginal.woff2": "NotoSansCanadianAboriginal",
	"NotoSansMath-Regular.woff2": "NotoSansMath-Regular",
	"noto-sans-sc-400.woff2": "NotoSansSC",
};

const BUNDLED_FONT_URLS: Record<string, URL> = {
	"phi.woff2": new URL(
		"../../../phi-assets/html/common/font/phi.woff2",
		import.meta.url,
	),
	"Aldrich-Regular.woff2": new URL(
		"../../../phi-assets/html/common/font/Aldrich-Regular.woff2",
		import.meta.url,
	),
	"NotoSans-Regular.woff2": new URL(
		"../../../phi-assets/html/common/font/NotoSans-Regular.woff2",
		import.meta.url,
	),
	"NotoSansJP.woff2": new URL(
		"../../../phi-assets/html/common/font/NotoSansJP.woff2",
		import.meta.url,
	),
	"NotoSansSymbols2.woff2": new URL(
		"../../../phi-assets/html/common/font/NotoSansSymbols2.woff2",
		import.meta.url,
	),
	"NotoSansArabic.woff2": new URL(
		"../../../phi-assets/html/common/font/NotoSansArabic.woff2",
		import.meta.url,
	),
	"NotoSansKannada.woff2": new URL(
		"../../../phi-assets/html/common/font/NotoSansKannada.woff2",
		import.meta.url,
	),
	"NotoSansCanadianAboriginal.woff2": new URL(
		"../../../phi-assets/html/common/font/NotoSansCanadianAboriginal.woff2",
		import.meta.url,
	),
	"NotoSansMath-Regular.woff2": new URL(
		"../../../phi-assets/html/common/font/NotoSansMath-Regular.woff2",
		import.meta.url,
	),
	"HIMALAYA.woff2": new URL(
		"../../../phi-assets/html/common/font/HIMALAYA.woff2",
		import.meta.url,
	),
	"吞弥恰俊.woff2": new URL(
		"../../../phi-assets/html/common/font/吞弥恰俊.woff2",
		import.meta.url,
	),
	"noto-sans-sc-400.woff2": new URL(
		"../../fonts/noto-sans-sc-400.woff2",
		import.meta.url,
	),
};

/** Default Takumi fallback after CSS `font-family`. NotoSansSC before PHI so CJK never tofus. */
export const PHI_FONT_FAMILIES = [
	"NotoSansSC",
	"PHI",
	"Aldrich",
	"NotoSansJP",
	"NOTO",
	"NotoSansArabic",
	"NotoSansSymbols2",
	"NotoSansKannada",
	"NotoSansCanadianAboriginal",
	"HIMALAYA",
	"吞弥恰俊",
	"NotoSansMath-Regular",
] as const;

function readBundled(file: string): Buffer | undefined {
	const url = BUNDLED_FONT_URLS[file];
	if (!url) return;
	try {
		return readFileSync(fileURLToPath(url));
	} catch {
		return;
	}
}

function readDisk(dir: string, name: string): Buffer | undefined {
	const file = join(dir, name);
	try {
		if (!exists(file)) return;
		return readFile(file);
	} catch {
		return;
	}
}

export async function loadFontsFromDir(
	dir: string,
	map: Record<string, string> = PHI_FONT_FILES,
): Promise<FontEntry[]> {
	const out: FontEntry[] = [];
	for (const [name, family] of Object.entries(map)) {
		const data =
			name === "noto-sans-sc-400.woff2"
				? (readBundled(name) ?? readDisk(dir, name))
				: (readDisk(dir, name) ?? readBundled(name));
		if (!data) {
			logger.warn(`font miss ${name}`);
			continue;
		}
		out.push({
			name: family,
			data,
			weight: 400,
			style: "normal",
			generic:
				family === "PHI" || family === "NotoSansSC" ? "sans-serif" : undefined,
		});
	}
	if (!out.some((f) => f.name === "PHI")) {
		logger.error("PHI font missing — CJK will render as missing glyphs");
	} else {
		logger.ok(`fonts ${out.map((f) => f.name).join(", ")}`);
	}
	return out;
}
