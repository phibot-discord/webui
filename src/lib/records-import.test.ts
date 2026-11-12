import assert from "node:assert/strict";
import test from "node:test";
import {
	MANUAL_MAX_RECORDS,
	manualRecordKey,
	parseAcc,
} from "@/phi/lib/manual-score";
import { exportDocument, exportRows, toCsv } from "./records-export";
import {
	applyImport,
	type EditorRow,
	IMPORT_MAX_BYTES,
	IMPORT_MAX_ROWS,
	type ImportRecord,
	type ImportSummary,
	parseRecordsFile,
	planImport,
	rowFields,
	splitCsv,
	unescapeCell,
} from "./records-import";

const zero: ImportSummary = {
	added: 0,
	improved: 0,
	kept: 0,
	unknown: 0,
	invalid: 0,
	repeated: 0,
	full: 0,
};

const known = (id: string) => id !== "gone.0";

const key = (id: string) => manualRecordKey(id, "IN");

function row(id: string, acc: string, score = "", fc = false): EditorRow {
	return { key: key(id), acc, score, fc };
}

function rec(
	id: string,
	acc: number,
	score?: number,
	fc = false,
): ImportRecord {
	return score === undefined
		? { id, rank: "IN", acc, fc }
		: { id, rank: "IN", acc, score, fc };
}

function make(r: ImportRecord): EditorRow {
	return { key: manualRecordKey(r.id, r.rank), ...rowFields(r) };
}

function summaryOf(rows: EditorRow[], records: ImportRecord[]) {
	return planImport(rows, { records, invalid: 0 }, known, MANUAL_MAX_RECORDS)
		.summary;
}

function jsonFile(records: unknown[]): string {
	return JSON.stringify({ records });
}

function csvFile(lines: string[]): string {
	return `id,level,acc,score\r\n${lines.join("\r\n")}\r\n`;
}

const good = { id: "a.0", level: "IN", acc: 99, score: 990_000 };

const badRows = [
	{ ...good, level: "LEGACY" },
	{ ...good, level: "in" },
	{ ...good, level: "SP" },
	{ ...good, acc: -1 },
	{ ...good, acc: 100.5 },
	{ ...good, score: 1.5 },
	{ ...good, score: 1_000_001 },
	{ ...good, score: -3 },
	{ ...good, id: "" },
	{ ...good, id: "x".repeat(161) },
];

const csvLine = (r: {
	id: string;
	level: string;
	acc: unknown;
	score: unknown;
}) => `${r.id},${r.level},${String(r.acc)},${String(r.score)}`;

test("a file the export writes is read back the same from JSON and CSV", () => {
	const rows = exportRows([
		{
			id: "ERABYECONNECIOIN.Ophelia.0",
			song: "+ERABY+E CONNEC+10N",
			rank: "IN",
			difficulty: 15.8,
			score: 1_000_000,
			acc: 100,
			fc: true,
			rks: 15.8,
			Rating: "phi",
		},
		{
			id: "=x.0",
			song: "x",
			rank: "HD",
			difficulty: 9.5,
			score: 990_000,
			acc: 99.123456789,
			fc: false,
			rks: 8.9,
			Rating: "V",
		},
	]);
	const json = JSON.stringify(
		exportDocument(
			{
				player: "Player",
				rks: 15.8,
				savedAt: null,
				exportedAt: "2026-11-11T00:00:00.000Z",
			},
			rows,
		),
	);
	const csv = toCsv(rows);
	assert.ok(csv.includes("'=x.0"));
	const fromJson = parseRecordsFile(json);
	const fromCsv = parseRecordsFile(csv);
	assert.deepEqual(fromJson, {
		ok: true,
		invalid: 0,
		records: [
			{
				id: "ERABYECONNECIOIN.Ophelia.0",
				rank: "IN",
				acc: 100,
				score: 1_000_000,
				fc: true,
			},
			{ id: "=x.0", rank: "HD", acc: 99.1235, score: 990_000, fc: false },
		],
	});
	assert.deepEqual(fromCsv, fromJson);
});

test("an older export is read and an unknown format or version is refused", () => {
	const records = [good];
	assert.deepEqual(parseRecordsFile(JSON.stringify({ player: "P", records })), {
		ok: true,
		invalid: 0,
		records: [{ id: "a.0", rank: "IN", acc: 99, score: 990_000, fc: false }],
	});
	assert.deepEqual(
		parseRecordsFile(JSON.stringify({ format: "other", version: 1, records })),
		{ ok: false, error: "unknown_format" },
	);
	assert.deepEqual(
		parseRecordsFile(
			JSON.stringify({ format: "phibot-records", version: 2, records }),
		),
		{ ok: false, error: "newer_version" },
	);
	for (const version of [0, "1"]) {
		assert.deepEqual(
			parseRecordsFile(
				JSON.stringify({ format: "phibot-records", version, records }),
			),
			{ ok: false, error: "unknown_format" },
		);
	}
});

test("a raw cloud save is refused without keeping any of it", () => {
	const blob = {
		session: "FAKE-SESSION-TOKEN-0000",
		saveInfo: {},
		gameRecord: {},
	};
	for (const doc of [blob, { ...blob, records: [good] }]) {
		const result = parseRecordsFile(JSON.stringify(doc));
		assert.deepEqual(result, { ok: false, error: "raw_save" });
		assert.ok(!JSON.stringify(result).includes("FAKE-SESSION"));
	}
});

test("a CSV re-saved by a spreadsheet is still read", () => {
	const text = [
		"level, Acc ,ID,song,fc,Score",
		'IN,99.5,a.0,"one, ""two""\nthree",TRUE,995000',
		"HD,98,'abc,x,false,",
		"EZ,100,'@x,y,false,1000000",
		"",
		"",
	].join("\n");
	assert.deepEqual(parseRecordsFile(text), {
		ok: true,
		invalid: 0,
		records: [
			{ id: "a.0", rank: "IN", acc: 99.5, score: 995_000, fc: true },
			{ id: "'abc", rank: "HD", acc: 98, fc: false },
			{ id: "@x", rank: "EZ", acc: 100, score: 1_000_000, fc: true },
		],
	});
	assert.deepEqual(splitCsv('a,"one, ""two""\nthree"\n'), [
		["a", 'one, "two"\nthree'],
	]);
	assert.equal(unescapeCell("'abc"), "'abc");
	assert.equal(unescapeCell("'@x"), "@x");
});

test("broken or empty files give their error", () => {
	const cases: [string, string][] = [
		["{", "bad_json"],
		['id,level,acc\n"a.0,IN,99\n', "bad_csv"],
		['"a"b', "bad_csv"],
		["id,level,score\na.0,IN,990000\n", "unknown_format"],
		["", "empty"],
		['""', "empty"],
		[" \r\n ", "empty"],
		["id,level,acc\r\n", "empty"],
		['{"records":[]}', "empty"],
		["[1]", "unknown_format"],
	];
	for (const [text, error] of cases) {
		assert.deepEqual(parseRecordsFile(text), { ok: false, error }, text);
	}
});

test("bad rows count as invalid and the rest is read", () => {
	const zeroScore = { id: "b.0", rank: "IN", acc: 99, fc: false };
	const read = [
		{ id: "a.0", rank: "IN", acc: 99, score: 990_000, fc: false },
		zeroScore,
	];
	assert.deepEqual(
		parseRecordsFile(
			jsonFile([
				good,
				...badRows,
				{ ...good, acc: "99" },
				{ ...good, acc: null },
				{ ...good, id: "b.0", score: 0 },
			]),
		),
		{ ok: true, invalid: 12, records: read },
	);
	assert.deepEqual(
		parseRecordsFile(
			csvFile([
				csvLine(good),
				...badRows.map(csvLine),
				csvLine({ ...good, acc: "1e2" }),
				csvLine({ ...good, acc: "" }),
				csvLine({ ...good, acc: "NaN" }),
				csvLine({ ...good, id: "b.0", score: 0 }),
			]),
		),
		{ ok: true, invalid: 13, records: read },
	);
});

test("files over the size or row cap are refused", () => {
	assert.deepEqual(parseRecordsFile("x".repeat(IMPORT_MAX_BYTES + 1)), {
		ok: false,
		error: "too_large",
	});
	const many = (n: number) =>
		Array.from({ length: n }, (_, i) => ({ ...good, id: `s${i}.0` }));
	for (const n of [IMPORT_MAX_ROWS + 1, IMPORT_MAX_ROWS]) {
		for (const text of [jsonFile(many(n)), csvFile(many(n).map(csvLine))]) {
			const result = parseRecordsFile(text);
			if (n > IMPORT_MAX_ROWS) {
				assert.deepEqual(result, { ok: false, error: "too_many_rows" });
			} else {
				assert.ok(result.ok);
				assert.equal(result.records.length, IMPORT_MAX_ROWS);
				assert.equal(result.invalid, 0);
			}
		}
	}
});

test("a merge keeps the better score by accuracy", () => {
	assert.deepEqual(summaryOf([row("a.0", "98")], [rec("a.0", 99)]), {
		...zero,
		improved: 1,
	});
	assert.deepEqual(summaryOf([row("a.0", "99")], [rec("a.0", 98)]), {
		...zero,
		kept: 1,
	});
	assert.deepEqual(
		summaryOf([row("a.0", "99.123456")], [rec("a.0", 99.1235)]),
		{
			...zero,
			kept: 1,
		},
	);
	assert.deepEqual(
		summaryOf([row("a.0", "99.5", "990000")], [rec("a.0", 99.5, 995_000)]),
		{ ...zero, improved: 1 },
	);
	assert.deepEqual(
		summaryOf([row("a.0", "99.123449")], [rec("a.0", 99.1234, 999_999)]),
		{ ...zero, kept: 1 },
	);
	assert.deepEqual(
		summaryOf([row("a.0", "99.5", "995000")], [rec("a.0", 99.5, 995_000)]),
		{ ...zero, kept: 1 },
	);
	const blank = planImport(
		[row("a.0", "")],
		{ records: [rec("a.0", 97)], invalid: 0 },
		known,
		MANUAL_MAX_RECORDS,
	);
	assert.deepEqual(blank.summary, { ...zero, added: 1 });
	assert.deepEqual([...blank.replace.keys()], [key("a.0")]);
	assert.deepEqual(blank.add, []);
	const unknown = planImport(
		[],
		{ records: [rec("gone.0", 99)], invalid: 0 },
		known,
		MANUAL_MAX_RECORDS,
	);
	assert.deepEqual(unknown.summary, { ...zero, unknown: 1 });
	assert.deepEqual(unknown.add, []);
});

test("a full list takes new charts only up to the limit", () => {
	const rows = Array.from({ length: MANUAL_MAX_RECORDS - 1 }, (_, i) =>
		row(`r${i}.0`, "99"),
	);
	const plan = planImport(
		rows,
		{
			records: [rec("n1.0", 99), rec("n2.0", 99), rec("n3.0", 99)],
			invalid: 0,
		},
		known,
		MANUAL_MAX_RECORDS,
	);
	assert.deepEqual(plan.summary, { ...zero, added: 1, full: 2 });
	assert.deepEqual(
		plan.add.map((r) => r.id),
		["n1.0"],
	);
	const after = applyImport(rows, plan, make);
	assert.equal(after.length, MANUAL_MAX_RECORDS);
	const keys = new Set(after.map((r) => r.key));
	assert.ok(rows.every((r) => keys.has(r.key)));
});

test("repeats in one file keep the better one and every row is counted", () => {
	const lines = [
		"a.0,IN,98,",
		"a.0,IN,99.5,",
		"a.0,IN,99,",
		"b.0,IN,97,",
		"c.0,IN,95,",
		"gone.0,IN,99,",
		"bad.0,XX,99,",
		"d.0,HD,90,",
		"e.0,EZ,80,",
	];
	const parsed = parseRecordsFile(csvFile(lines));
	assert.ok(parsed.ok);
	const rows = [row("b.0", "98"), row("c.0", "90")];
	const plan = planImport(rows, parsed, known, rows.length + 2);
	assert.deepEqual(plan.summary, {
		added: 2,
		improved: 1,
		kept: 1,
		unknown: 1,
		invalid: 1,
		repeated: 2,
		full: 1,
	});
	assert.deepEqual(plan.add, [
		{ id: "a.0", rank: "IN", acc: 99.5, fc: false },
		{ id: "d.0", rank: "HD", acc: 90, fc: false },
	]);
	const total = Object.values(plan.summary).reduce((a, b) => a + b, 0);
	assert.equal(total, lines.length);
});

test("applying an import never loses a row or lowers an accuracy", () => {
	const rows = [
		{ ...row("w.0", "99"), note: "w" },
		{ ...row("b.0", "95", "950000"), note: "b" },
		{ ...row("t.0", "97", "970000"), note: "t" },
		{ ...row("e.0", ""), note: "e" },
	];
	const before = structuredClone(rows);
	const plan = planImport(
		rows,
		{
			records: [
				rec("n1.0", 96.123456, 960_000),
				rec("b.0", 96.5),
				rec("w.0", 98),
				rec("t.0", 97, 970_000),
				rec("e.0", 93.25),
				rec("n2.0", 100, 1_000_000, true),
			],
			invalid: 0,
		},
		known,
		MANUAL_MAX_RECORDS,
	);
	const after = applyImport(rows, plan, (r) => ({ ...make(r), note: "new" }));
	assert.deepEqual(rows, before);
	assert.deepEqual(
		after.map((r) => r.key),
		[...rows.map((r) => r.key), key("n1.0"), key("n2.0")],
	);
	assert.deepEqual(
		after.map((r) => r.note),
		["w", "b", "t", "e", "new", "new"],
	);
	assert.deepEqual(after[0], rows[0]);
	assert.deepEqual(after[1], {
		key: key("b.0"),
		acc: "96.5",
		score: "",
		fc: false,
		note: "b",
	});
	assert.deepEqual(after[2], rows[2]);
	assert.equal(after[3]?.acc, "93.25");
	for (const r of after) assert.notEqual(parseAcc(r.acc), undefined);
	for (const old of rows) {
		const got = after.find((r) => r.key === old.key);
		assert.ok(got);
		const was = parseAcc(old.acc);
		if (was !== undefined) assert.ok((parseAcc(got.acc) ?? -1) >= was);
	}
});

test("an editor row whose score is 0 counts with its estimate when a file is merged", () => {
	assert.deepEqual(
		summaryOf([row("a.0", "98", "0")], [rec("a.0", 98, 975_000)]),
		{ ...zero, kept: 1 },
	);
	assert.deepEqual(summaryOf([row("a.0", "98")], [rec("a.0", 98, 975_000)]), {
		...zero,
		kept: 1,
	});
});
