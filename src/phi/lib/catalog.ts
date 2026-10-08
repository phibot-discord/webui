import { join } from "node:path";
import { loadedCatalogRevision } from "@/server/song-info";
import { getInfo } from "./get-info";

/** Card-facing view of `getInfo`, so info.csv / notesInfo.json are not parsed a second time */
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

	ill(
		id: string,
		kind: "common" | "blur" | "low" = "common",
	): string | undefined {
		const key = knownBackground(id);
		if (!key) return;
		return getInfo.getill(key, kind);
	}
}

export function knownBackground(id: string | undefined): string {
	const raw = id?.trim() ?? "";
	if (!raw) return "";
	const key = raw.endsWith(".0") ? raw : `${raw}.0`;
	if (getInfo.illlist.includes(key)) return key;
	if (getInfo.illlist.includes(raw)) return raw;
	return "";
}

export type BackgroundOption = { id: string; song: string };

let optionsMemo:
	| { rev: string; list: string[]; options: BackgroundOption[] }
	| undefined;

/** Built once per catalog revision and shared: don't mutate */
export function backgroundOptions(): BackgroundOption[] {
	const rev = loadedCatalogRevision();
	const list = getInfo.illlist;
	if (optionsMemo && optionsMemo.rev === rev && optionsMemo.list === list) {
		return optionsMemo.options;
	}
	const options = buildBackgroundOptions(list);
	optionsMemo = { rev, list, options };
	return options;
}

function buildBackgroundOptions(list: string[]): BackgroundOption[] {
	const seen = new Set<string>();
	const out: BackgroundOption[] = [];
	for (const id of list) {
		if (seen.has(id)) continue;
		seen.add(id);
		out.push({
			id,
			song: getInfo.ori_info[id]?.song || getInfo.sp_info[id]?.song || id,
		});
	}
	out.sort(
		(a, b) =>
			a.song.localeCompare(b.song, undefined, { sensitivity: "base" }) ||
			a.id.localeCompare(b.id),
	);
	return out;
}

export function chosenIll(
	catalog: Pick<Catalog, "randomIll"> & Partial<Pick<Catalog, "ill">>,
	id: string | undefined,
	kind: "common" | "blur" | "low",
): string {
	if (id) {
		const picked = catalog.ill?.(id, kind);
		if (picked) return picked;
	}
	return catalog.randomIll(kind);
}
