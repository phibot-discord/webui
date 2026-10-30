export type ExportRecord = {
	id: string;
	song?: string;
	rank: string;
	difficulty: number;
	score: number;
	acc: number;
	fc: boolean;
	rks: number;
	Rating: string;
};

export type ExportRow = {
	id: string;
	song: string;
	level: string;
	constant: number;
	score: number;
	acc: number;
	fc: boolean;
	ap: boolean;
	rks: number;
	rating: string;
};

export type ExportFormat = "csv" | "json";

const COLUMNS = [
	"id",
	"song",
	"level",
	"constant",
	"score",
	"acc",
	"fc",
	"ap",
	"rks",
	"rating",
] as const satisfies readonly (keyof ExportRow)[];

const round = (n: number, places: number) =>
	Number.isFinite(n) ? Number(n.toFixed(places)) : 0;

export function parseExportFormat(raw: string | null): ExportFormat {
	return raw === "json" ? "json" : "csv";
}

export function exportRows(records: readonly ExportRecord[]): ExportRow[] {
	return records.map((r) => ({
		id: r.id,
		song: r.song ?? r.id,
		level: r.rank,
		constant: round(r.difficulty, 1),
		score: r.score,
		acc: round(r.acc, 4),
		fc: r.fc || r.score === 1_000_000,
		ap: r.score === 1_000_000,
		rks: round(r.rks, 4),
		rating: r.Rating,
	}));
}

export function csvCell(value: string | number | boolean): string {
	if (typeof value !== "string") return String(value);
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return /[",\r\n']/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(rows: readonly ExportRow[]): string {
	const lines = [
		COLUMNS.join(","),
		...rows.map((row) => COLUMNS.map((key) => csvCell(row[key])).join(",")),
	];
	return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function exportFileName(
	format: ExportFormat,
	at: Date = new Date(),
): string {
	return `phibot-records-${at.toISOString().slice(0, 10)}.${format}`;
}
