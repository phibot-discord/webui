import { LEVEL, type LevelKind } from "@/phi/lib/const";

export type SortKey =
	| "c"
	| "title"
	| "notes"
	| "nps"
	| "bpm"
	| "length"
	| "acc";
export type StatusFilter = "all" | "none" | "notFc" | "notAp" | "played";
export type ChartSort = { key: SortKey; desc: boolean };

export type ChartFilters = {
	q: string;
	levels: LevelKind[];
	cMin: string;
	cMax: string;
	tag: string;
	chapter: string;
	status: StatusFilter;
	sort: ChartSort;
};

export type FilterChoices = {
	tags: readonly number[];
	chapters: readonly string[];
	scores: boolean;
};

export const STATUS_FILTERS: StatusFilter[] = [
	"all",
	"none",
	"notFc",
	"notAp",
	"played",
];
const SORT_KEYS: SortKey[] = [
	"c",
	"title",
	"notes",
	"nps",
	"bpm",
	"length",
	"acc",
];
const DEFAULT_LEVELS: LevelKind[] = ["IN", "AT"];
export const Q_MAX = 100;
const CONSTANT = /^\d{1,2}(?:\.\d{1,2})?$/;
const CONSTANT_MAX = 18;

function firstDesc(key: SortKey): boolean {
	return key !== "title";
}

function cleanQ(raw: string): string {
	return raw.trim().slice(0, Q_MAX).trim();
}

function constant(raw: string | null): string {
	const s = (raw ?? "").trim();
	return CONSTANT.test(s) && Number(s) <= CONSTANT_MAX ? s : "";
}

function levelsOf(raw: string | null): LevelKind[] {
	if (raw === null) return [...DEFAULT_LEVELS];
	if (raw === "") return [];
	const want = new Set(raw.toUpperCase().split("-"));
	const out = LEVEL.filter((l) => want.has(l));
	return out.length ? out : [...DEFAULT_LEVELS];
}

function tagOf(raw: string | null, tags: readonly number[]): string {
	if (!raw || !/^\d{1,9}$/.test(raw)) return "";
	const id = Number(raw);
	return tags.includes(id) ? String(id) : "";
}

function sortOf(
	rawKey: string | null,
	rawDir: string | null,
	scores: boolean,
): ChartSort {
	const key = rawKey === null ? "c" : SORT_KEYS.find((k) => k === rawKey);
	if (!key || (key === "acc" && !scores)) return { key: "c", desc: true };
	const desc =
		rawDir === "asc" ? false : rawDir === "desc" ? true : firstDesc(key);
	return { key, desc };
}

export function filterChoices(
	view: { tags: readonly { id: number }[]; chapters: readonly string[] },
	scores: boolean,
): FilterChoices {
	return { tags: view.tags.map((t) => t.id), chapters: view.chapters, scores };
}

export function parseChartQuery(
	params: { get(name: string): string | null },
	choices: FilterChoices,
): ChartFilters {
	const chapter = params.get("ch") ?? "";
	const status = params.get("status");
	return {
		q: cleanQ(params.get("q") ?? ""),
		levels: levelsOf(params.get("lv")),
		cMin: constant(params.get("cmin")),
		cMax: constant(params.get("cmax")),
		tag: tagOf(params.get("tag"), choices.tags),
		chapter: choices.chapters.includes(chapter) ? chapter : "",
		status: choices.scores
			? (STATUS_FILTERS.find((s) => s === status) ?? "all")
			: "all",
		sort: sortOf(params.get("sort"), params.get("dir"), choices.scores),
	};
}

export function chartQuery(f: ChartFilters): string {
	const out = new URLSearchParams();
	const q = cleanQ(f.q);
	if (q) out.set("q", q);
	const levels = LEVEL.filter((l) => f.levels.includes(l)).join("-");
	if (levels !== DEFAULT_LEVELS.join("-")) out.set("lv", levels);
	const cMin = constant(f.cMin);
	if (cMin) out.set("cmin", cMin);
	const cMax = constant(f.cMax);
	if (cMax) out.set("cmax", cMax);
	if (f.tag) out.set("tag", f.tag);
	if (f.chapter) out.set("ch", f.chapter);
	if (f.status !== "all") out.set("status", f.status);
	if (f.sort.key !== "c") out.set("sort", f.sort.key);
	if (f.sort.desc !== firstDesc(f.sort.key))
		out.set("dir", f.sort.desc ? "desc" : "asc");
	return out.toString();
}

export function chartsHref(search: string): string {
	return search ? `/charts?${search}` : "/charts";
}

export function searchParamsOf(
	record: Record<string, string | string[] | undefined>,
): URLSearchParams {
	const out = new URLSearchParams();
	for (const [key, value] of Object.entries(record)) {
		const first = Array.isArray(value) ? value[0] : value;
		if (first !== undefined) out.set(key, first);
	}
	return out;
}
