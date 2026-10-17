import type { ChartCell, ChartSummary } from "@/server/charts";

export type { ChartCell, ChartSummary, RemovedCell } from "@/server/charts";

// SP is the 4/1 specials' level; the scored catalog never has it
export const CHART_LEVELS = ["EZ", "HD", "IN", "AT", "SP"] as const;
export type ChartLevel = (typeof CHART_LEVELS)[number];

export type ChartRef = { id: string; rank: ChartLevel };

/** A catalog id without its `.0`, as file names and stems have it */
export function bareId(id: string): string {
	return id.replace(/\.0$/, "");
}

const SCORED_LEVELS: readonly string[] = ["EZ", "HD", "IN", "AT"];
// Any level a track folder ships a chart for, as phi-unpackd names it (EZ…AT, Legacy, EZ_Error…)
const PACK_LEVEL = /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/;

export type PackLevel = string;

export function isPackLevel(v: string): boolean {
	return v.length <= 32 && PACK_LEVEL.test(v);
}

/** A pack the song list does not offer: Legacy, or a chart only an unlock plays */
export function isExtraPackLevel(v: string): boolean {
	return isPackLevel(v) && !SCORED_LEVELS.includes(v);
}

/** `base` colours a level that starts with one of EZ…SP; others get the neutral chip */
export type PackLevelName = { base?: ChartLevel; tag: string; label: string };

/** `EZ_Error` → EZ coloured, labelled "EZ Error"; `Legacy` → neutral, "Legacy" */
export function packLevelName(level: string): PackLevelName | undefined {
	if (!isPackLevel(level)) return undefined;
	const [head = "", ...rest] = level.split("_");
	const base = CHART_LEVELS.find((l) => l === head);
	return base
		? { base, tag: rest.join(" "), label: level.replaceAll("_", " ") }
		: { tag: "", label: level.replaceAll("_", " ") };
}

const pending: Record<"scored" | "fools", Promise<ChartSummary[]> | undefined> =
	{ scored: undefined, fools: undefined };

/** `fools` adds the 4/1 specials, which have no constant: never for scoring */
export function loadChartCatalog(fools = false): Promise<ChartSummary[]> {
	const slot = fools ? "fools" : "scored";
	if (!pending[slot]) {
		// "no-cache" revalidates with the ETag, so an unchanged catalog is a 304
		pending[slot] = fetch(fools ? "/api/charts?fools=1" : "/api/charts", {
			cache: "no-cache",
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(`charts ${res.status}`);
				return (await res.json()) as ChartSummary[];
			})
			.catch((err) => {
				pending[slot] = undefined;
				throw err;
			});
	}
	return pending[slot];
}

/** The constant, or the label a chart without one carries */
export function cellLabel(cell: ChartCell): string {
	return cell[2] ?? cell[0].toFixed(1);
}

export function findChart(
	list: ChartSummary[],
	ref: ChartRef,
):
	| { song: ChartSummary; difficulty: number; notes: number | null }
	| undefined {
	const song = list.find((s) => s.id === ref.id);
	const cell = song?.charts[ref.rank];
	if (!song || !cell) return;
	return { song, difficulty: cell[0], notes: cell[1] };
}
