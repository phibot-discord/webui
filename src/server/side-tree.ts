import { bareId } from "@/lib/chart-catalog";
import { positiveInt, text, v1Body } from "@/lib/parse";
import { withDotZero } from "@/phi/lib/get-info";
import type { AliasIndex } from "./aliases";
import type { ChartSummary } from "./charts";

// Shared parsing for the extra trees (`4-1/`, `removed/`, `history/`): `{ v: 1, songs: [...] }` manifests

type Row = Record<string, unknown>;

/** The manifest's song rows; a bad body gives none */
export function songRows(raw: unknown): Row[] {
	const songs = v1Body(raw)?.songs;
	if (!Array.isArray(songs)) return [];
	return songs.filter((row): row is Row =>
		Boolean(row && typeof row === "object"),
	);
}

/** A row's `charts` map as level → entry, keeping only object entries */
export function chartRows(r: Row): [string, Row][] {
	const levels = r.charts && typeof r.charts === "object" ? r.charts : {};
	return Object.entries(levels).filter((e): e is [string, Row] =>
		Boolean(e[1] && typeof e[1] === "object"),
	);
}

export function chartBase(c: Row) {
	const { label, charter, notes } = c;
	return {
		label: text(label).trim() || "?",
		charter: text(charter),
		notes: positiveInt(notes) ?? null,
	};
}

/** The catalog id (with `.0`) and the file stem, which defaults to the bare id */
export function songIds(id: string, stem: unknown) {
	return { id: withDotZero(id), stem: text(stem).trim() || bareId(id) };
}

export function findSong<T extends { id: string }>(
	songs: readonly T[],
	id: string,
): T | undefined {
	const want = bareId(id);
	return songs.find((s) => bareId(s.id) === want);
}

/** A catalog row for a side-tree song; callers add their own extra fields */
export function sideSummary(
	s: { id: string; stem: string; song: string; composer: string },
	charts: ChartSummary["charts"],
	aliases?: AliasIndex["byId"],
): ChartSummary {
	const nicks = aliases?.get(s.id);
	return {
		id: s.id,
		...(s.stem !== bareId(s.id) ? { stem: s.stem } : {}),
		song: s.song,
		composer: s.composer,
		...(nicks?.length ? { aliases: nicks.map((a) => a.text) } : {}),
		charts,
	};
}
