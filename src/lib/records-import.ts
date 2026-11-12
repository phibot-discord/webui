import { isChartId } from "@/lib/chart-catalog";
import { EXPORT_FORMAT, EXPORT_VERSION } from "@/lib/records-export";
import type { LevelKind } from "@/phi/lib/const";
import {
	effectiveScore,
	isLevelKind,
	manualRecordKey,
	parseAcc,
	roundAcc,
	validAcc,
	validScore,
} from "@/phi/lib/manual-score";

export const IMPORT_MAX_BYTES = 2_097_152;
export const IMPORT_MAX_ROWS = 4000;

export type ImportError =
	| "too_large"
	| "unreadable"
	| "empty"
	| "raw_save"
	| "unknown_format"
	| "newer_version"
	| "bad_json"
	| "bad_csv"
	| "too_many_rows";

export type ImportRecord = {
	id: string;
	rank: LevelKind;
	acc: number;
	score?: number;
	fc: boolean;
};

export type ParsedRecords = { records: ImportRecord[]; invalid: number };

export type ParseResult =
	| ({ ok: true } & ParsedRecords)
	| { ok: false; error: ImportError };

export type EditorRow = {
	key: string;
	acc: string;
	score: string;
	fc: boolean;
};

export type ImportSummary = {
	added: number;
	improved: number;
	kept: number;
	unknown: number;
	invalid: number;
	repeated: number;
	full: number;
};

export type ImportPlan = {
	replace: Map<string, ImportRecord>;
	add: ImportRecord[];
	summary: ImportSummary;
};

type Standing = { acc: number; score?: number; fc: boolean };

const BOM = "\uFEFF";

const RAW_SAVE_KEYS = [
	"session",
	"saveInfo",
	"gameRecord",
	"gameProgress",
	"gameuser",
	"gamesettings",
	"playerInfo",
	"Recordver",
] as const;

const CSV_ACC = /^\d{1,3}(\.\d+)?$/;
const SCORE_DIGITS = /^\d{1,7}$/;
const CSV_TRUE = /^true$/i;
const FORMULA_LEAD = "=+-@\t\r";

function dropBom(text: string): string {
	return text.startsWith(BOM) ? text.slice(1) : text;
}

function fail(error: ImportError): ParseResult {
	return { ok: false, error };
}

function toRecord(
	id: unknown,
	level: unknown,
	acc: unknown,
	score: unknown,
	fc: boolean,
): ImportRecord | undefined {
	if (typeof id !== "string" || !isChartId(id)) return;
	if (typeof level !== "string" || !isLevelKind(level)) return;
	if (!validAcc(acc)) return;
	if (score !== undefined && score !== null && !validScore(score)) return;
	const rounded = roundAcc(acc);
	const rec: ImportRecord = {
		id,
		rank: level,
		acc: rounded,
		fc: fc || rounded >= 100,
	};
	if (typeof score === "number" && score > 0) rec.score = score;
	return rec;
}

export function parseRecordsFile(text: string): ParseResult {
	if (text.length > IMPORT_MAX_BYTES) return fail("too_large");
	const body = dropBom(text);
	const lead = body.trimStart();
	if (lead === "") return fail("empty");
	return lead[0] === "{" || lead[0] === "["
		? parseRecordsJson(body)
		: parseRecordsCsv(body);
}

export function parseRecordsJson(text: string): ParseResult {
	let doc: unknown;
	try {
		doc = JSON.parse(dropBom(text));
	} catch {
		return fail("bad_json");
	}
	if (typeof doc !== "object" || doc === null || Array.isArray(doc))
		return fail("unknown_format");
	const obj = doc as Record<string, unknown>;
	if (RAW_SAVE_KEYS.some((key) => Object.hasOwn(obj, key)))
		return fail("raw_save");
	if (Object.hasOwn(obj, "format") && obj.format !== EXPORT_FORMAT)
		return fail("unknown_format");
	if (Object.hasOwn(obj, "version")) {
		const version = obj.version;
		if (
			typeof version !== "number" ||
			!Number.isInteger(version) ||
			version < 1
		)
			return fail("unknown_format");
		if (version > EXPORT_VERSION) return fail("newer_version");
	}
	const list = obj.records;
	if (!Array.isArray(list)) return fail("unknown_format");
	if (list.length === 0) return fail("empty");
	if (list.length > IMPORT_MAX_ROWS) return fail("too_many_rows");
	const records: ImportRecord[] = [];
	let invalid = 0;
	for (const item of list) {
		const el =
			typeof item === "object" && item !== null
				? (item as Record<string, unknown>)
				: undefined;
		const rec = el
			? toRecord(el.id, el.level, el.acc, el.score, el.fc === true)
			: undefined;
		if (rec) records.push(rec);
		else invalid += 1;
	}
	return { ok: true, records, invalid };
}

export function splitCsv(text: string): string[][] | undefined {
	const src = dropBom(text);
	const end = src.length;
	const rows: string[][] = [];
	let row: string[] = [];
	let i = 0;
	for (;;) {
		let cell = "";
		if (src[i] === '"') {
			i += 1;
			for (;;) {
				const quote = src.indexOf('"', i);
				if (quote < 0) return undefined;
				cell += src.slice(i, quote);
				if (src[quote + 1] === '"') {
					cell += '"';
					i = quote + 2;
					continue;
				}
				i = quote + 1;
				break;
			}
			if (i < end && src[i] !== "," && src[i] !== "\r" && src[i] !== "\n")
				return undefined;
		} else {
			let stop = i;
			while (
				stop < end &&
				src[stop] !== "," &&
				src[stop] !== "\r" &&
				src[stop] !== "\n"
			)
				stop += 1;
			cell = src.slice(i, stop);
			i = stop;
		}
		row.push(cell);
		if (i >= end) {
			rows.push(row);
			return rows;
		}
		if (src[i] === ",") {
			i += 1;
			continue;
		}
		i += src[i] === "\r" && src[i + 1] === "\n" ? 2 : 1;
		rows.push(row);
		row = [];
		if (i >= end) return rows;
	}
}

export function unescapeCell(cell: string): string {
	return cell.length >= 2 &&
		cell[0] === "'" &&
		FORMULA_LEAD.includes(cell[1] ?? "")
		? cell.slice(1)
		: cell;
}

export function parseRecordsCsv(text: string): ParseResult {
	const split = splitCsv(text);
	if (!split) return fail("bad_csv");
	const rows = split.filter((row) => !(row.length === 1 && row[0] === ""));
	const [head, ...data] = rows;
	if (!head) return fail("empty");
	const names = head.map((name) => name.trim().toLowerCase());
	const col = {
		id: names.indexOf("id"),
		level: names.indexOf("level"),
		acc: names.indexOf("acc"),
		score: names.indexOf("score"),
		fc: names.indexOf("fc"),
	};
	if (col.id < 0 || col.level < 0 || col.acc < 0) return fail("unknown_format");
	if (data.length === 0) return fail("empty");
	if (data.length > IMPORT_MAX_ROWS) return fail("too_many_rows");
	const records: ImportRecord[] = [];
	let invalid = 0;
	for (const row of data) {
		const cell = (index: number) =>
			index < 0 ? "" : unescapeCell(row[index] ?? "").trim();
		const accCell = cell(col.acc);
		const scoreCell = cell(col.score);
		const acc = CSV_ACC.test(accCell) ? Number(accCell) : undefined;
		const score =
			scoreCell === ""
				? undefined
				: SCORE_DIGITS.test(scoreCell)
					? Number(scoreCell)
					: Number.NaN;
		const rec = toRecord(
			cell(col.id),
			cell(col.level),
			acc,
			score,
			CSV_TRUE.test(cell(col.fc)),
		);
		if (rec) records.push(rec);
		else invalid += 1;
	}
	return { ok: true, records, invalid };
}

function beats(next: Standing, held: Standing): boolean {
	const nextAcc = Math.round(next.acc * 1e4);
	const heldAcc = Math.round(held.acc * 1e4);
	if (nextAcc !== heldAcc) return nextAcc > heldAcc;
	return effectiveScore(next) > effectiveScore(held) && next.acc >= held.acc;
}

function rowStanding(row: EditorRow, acc: number): Standing {
	const score =
		SCORE_DIGITS.test(row.score) && validScore(Number(row.score))
			? Number(row.score)
			: undefined;
	return { acc, score, fc: row.fc || acc >= 100 };
}

export function rowFields(rec: ImportRecord): {
	acc: string;
	score: string;
	fc: boolean;
} {
	return {
		acc: String(rec.acc),
		score: rec.score === undefined ? "" : String(rec.score),
		fc: rec.fc,
	};
}

export function planImport(
	rows: readonly EditorRow[],
	parsed: ParsedRecords,
	known: (id: string, rank: LevelKind) => boolean,
	max: number,
): ImportPlan {
	const summary: ImportSummary = {
		added: 0,
		improved: 0,
		kept: 0,
		unknown: 0,
		invalid: parsed.invalid,
		repeated: 0,
		full: 0,
	};
	const held = new Map<string, ImportRecord>();
	for (const rec of parsed.records) {
		const key = manualRecordKey(rec.id, rec.rank);
		const prev = held.get(key);
		if (!prev) {
			held.set(key, rec);
			continue;
		}
		summary.repeated += 1;
		if (beats(rec, prev)) held.set(key, rec);
	}
	const byKey = new Map(rows.map((row) => [row.key, row]));
	const replace = new Map<string, ImportRecord>();
	const add: ImportRecord[] = [];
	for (const [key, rec] of held) {
		if (!known(rec.id, rec.rank)) {
			summary.unknown += 1;
			continue;
		}
		const row = byKey.get(key);
		if (row) {
			const acc = parseAcc(row.acc);
			if (acc === undefined) {
				replace.set(key, rec);
				summary.added += 1;
			} else if (beats(rec, rowStanding(row, acc))) {
				replace.set(key, rec);
				summary.improved += 1;
			} else {
				summary.kept += 1;
			}
		} else if (rows.length + add.length >= max) {
			summary.full += 1;
		} else {
			add.push(rec);
			summary.added += 1;
		}
	}
	return { replace, add, summary };
}

export function applyImport<R extends EditorRow>(
	rows: readonly R[],
	plan: ImportPlan,
	make: (rec: ImportRecord) => R,
): R[] {
	const next = rows.map((row) => {
		const rec = plan.replace.get(row.key);
		return rec ? { ...row, ...rowFields(rec) } : row;
	});
	return [...next, ...plan.add.map(make)];
}
