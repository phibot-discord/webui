import { join } from "node:path";
import { readdir, readFile } from "@/server/vfs";
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
};

export async function loadFontsFromDir(
	dir: string,
	map: Record<string, string> = PHI_FONT_FILES,
): Promise<FontEntry[]> {
	let names: string[] = [];
	try {
		names = readdir(dir);
	} catch {
		return [];
	}
	const out: FontEntry[] = [];
	for (const name of names) {
		const family = map[name];
		if (!family) continue;
		const file = join(dir, name);
		try {
			const data = readFile(file);
			out.push({ name: family, data, weight: 400, style: "normal" });
		} catch {
			logger.warn(`font miss ${name}`);
		}
	}
	return out;
}
