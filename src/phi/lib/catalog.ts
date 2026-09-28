import { join } from "node:path";
import { getInfo } from "./get-info";

/**
 * Card-facing view of the song catalog. Reads `getInfo` (already parsed by
 * `ensureSongInfo`) instead of parsing info.csv / notesInfo.json a second time.
 */
export class Catalog {
	readonly fallbackIll: string;

	constructor(resources: string) {
		this.fallbackIll = join(resources, "html/otherimg/phigros.png");
	}

	get tips(): string[] {
		return getInfo.tips;
	}

	get size(): number {
		return getInfo.idList.length;
	}

	randomIll(kind: "common" | "blur" | "low" = "common"): string {
		const list = getInfo.illlist;
		if (!list.length) return this.fallbackIll;
		const id = list[Math.floor(Math.random() * list.length)]!;
		return getInfo.getill(id, kind);
	}
}
