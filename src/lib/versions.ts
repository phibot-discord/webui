import { fCompute } from "@/phi/lib/fcompute";
import { rankingScoreOf } from "@/phi/lib/manual-score";

export const VERSION_LEVELS = ["EZ", "HD", "IN", "AT"] as const;
export type VersionLevel = (typeof VERSION_LEVELS)[number];

export type VersionSong = {
	song?: string;
	levels: Partial<Record<VersionLevel, number>>;
};

export type VersionTable = ReadonlyMap<string, VersionSong>;

export type VersionMeta = {
	code: number;
	label: string;
	date: number | null;
	notes: string;
};

export type LevelChange = {
	id: string;
	rank: VersionLevel;
	from: number | null;
	to: number | null;
};

export type SongEntry = { id: string; levels: VersionSong["levels"] };

export type VersionDiff = {
	added: SongEntry[];
	removed: SongEntry[];
	changed: LevelChange[];
};

export type RecordAcc = { id: string; rank: string; acc: number };

export type RksUnder = {
	rks: number;
	charts: number;
};

const withDotZero = (id: string) => (id.endsWith(".0") ? id : `${id}.0`);

export function parseVersionTable(text: string): VersionTable {
	const lines = text
		.replace(/^﻿/, "")
		.split(/\r?\n/)
		.filter((l) => l.trim());
	const head = (lines[0] ?? "").split("\t").map((h) => h.trim());
	const col = (name: string) => head.indexOf(name);
	const idAt = col("id");
	const songAt = col("song");
	const out = new Map<string, VersionSong>();
	if (idAt < 0) return out;
	for (const line of lines.slice(1)) {
		const cells = line.split("\t");
		const id = cells[idAt]?.trim();
		if (!id) continue;
		const levels: VersionSong["levels"] = {};
		for (const level of VERSION_LEVELS) {
			const at = col(level);
			const raw = at < 0 ? "" : (cells[at]?.trim() ?? "");
			const n = raw ? Number(raw) : Number.NaN;
			if (Number.isFinite(n) && n > 0) levels[level] = n;
		}
		const song = songAt < 0 ? "" : (cells[songAt]?.trim() ?? "");
		out.set(withDotZero(id), { ...(song ? { song } : {}), levels });
	}
	return out;
}

export function parseVersionMeta(
	raw: unknown,
	code: number,
): VersionMeta | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const r = raw as Record<string, unknown>;
	const label =
		typeof r.version_label === "string" ? r.version_label.trim() : "";
	if (!label) return undefined;
	const date =
		typeof r.update_date === "number" && r.update_date > 0
			? r.update_date * 1000
			: null;
	const notes = typeof r.whatsnew === "string" ? r.whatsnew.trim() : "";
	return { code, label, date, notes };
}

export function diffTables(a: VersionTable, b: VersionTable): VersionDiff {
	const added: SongEntry[] = [];
	const removed: SongEntry[] = [];
	const changed: LevelChange[] = [];
	for (const [id, song] of b) {
		const old = a.get(id);
		if (!old) {
			added.push({ id, levels: song.levels });
			continue;
		}
		for (const rank of VERSION_LEVELS) {
			const from = old.levels[rank] ?? null;
			const to = song.levels[rank] ?? null;
			if (from !== to) changed.push({ id, rank, from, to });
		}
	}
	for (const [id, song] of a) {
		if (!b.has(id)) removed.push({ id, levels: song.levels });
	}
	changed.sort(
		(x, y) =>
			Math.abs((y.to ?? 0) - (y.from ?? 0)) -
				Math.abs((x.to ?? 0) - (x.from ?? 0)) ||
			(x.id < y.id ? -1 : x.id > y.id ? 1 : 0),
	);
	return { added, removed, changed };
}

export function rksUnder(
	records: readonly RecordAcc[],
	table: VersionTable,
): RksUnder {
	const rows: { acc: number; rks: number }[] = [];
	for (const r of records) {
		const c = table.get(r.id)?.levels[r.rank as VersionLevel];
		if (!c || !(r.acc > 0)) continue;
		rows.push({ acc: r.acc, rks: fCompute.rks(r.acc, c) });
	}
	return { rks: rows.length ? rankingScoreOf(rows) : 0, charts: rows.length };
}

export function pickVersions(
	codes: readonly number[],
	from: number | undefined,
	to: number | undefined,
): { from: number; to: number } | undefined {
	const sorted = [...new Set(codes)].sort((x, y) => x - y);
	const last = sorted.at(-1);
	if (last === undefined || sorted.length < 2) return undefined;
	const hasTo = to !== undefined && sorted.includes(to);
	const toCode = hasTo ? to : last;
	const before = sorted.filter((c) => c < toCode);
	const hasFrom =
		from !== undefined && sorted.includes(from) && from !== toCode;
	if (!hasFrom && !before.length)
		return { from: toCode, to: sorted[1] ?? toCode };
	const fromCode = hasFrom ? from : (before.at(-1) ?? toCode);
	return fromCode < toCode
		? { from: fromCode, to: toCode }
		: { from: toCode, to: fromCode };
}
