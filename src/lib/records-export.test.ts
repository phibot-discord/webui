import assert from "node:assert/strict";
import test from "node:test";
import {
	csvCell,
	exportFileName,
	exportRows,
	parseExportFormat,
	toCsv,
} from "./records-export";

const record = {
	id: "ERABYECONNECIOIN.Ophelia.0",
	song: "+ERABY+E CONNEC+10N",
	rank: "IN",
	difficulty: 15.8,
	score: 1_000_000,
	acc: 100,
	fc: true,
	rks: 15.8,
	Rating: "phi",
};

test("rows carry AP and FC from the score", () => {
	const [first, second] = exportRows([
		{ ...record, fc: false },
		{ ...record, score: 990_000, acc: 99.123456789, fc: false },
	]);
	assert.equal(first?.ap, true);
	assert.equal(first?.fc, true);
	assert.equal(second?.ap, false);
	assert.equal(second?.fc, false);
	assert.equal(second?.acc, 99.1235);
});

test("a cell a spreadsheet would run as a formula is defused", () => {
	assert.equal(csvCell("+ERABY+E CONNEC+10N"), `"'+ERABY+E CONNEC+10N"`);
	assert.equal(csvCell("=HYPERLINK(1)"), `"'=HYPERLINK(1)"`);
	assert.equal(csvCell("-x"), `"'-x"`);
	assert.equal(csvCell("@a"), `"'@a"`);
	assert.equal(csvCell("plain"), "plain");
	assert.equal(csvCell(-1), "-1");
});

test("commas, quotes and newlines are quoted", () => {
	assert.equal(csvCell('a,"b"'), `"a,""b"""`);
	assert.equal(csvCell("a\nb"), `"a\nb"`);
});

test("the CSV starts with a BOM and a header", () => {
	const csv = toCsv(exportRows([record]));
	assert.ok(csv.startsWith("\uFEFFid,song,level,"));
	assert.equal(csv.split("\r\n").length, 3);
	assert.ok(csv.includes(`"'+ERABY+E CONNEC+10N"`));
});

test("format and file name", () => {
	assert.equal(parseExportFormat("json"), "json");
	assert.equal(parseExportFormat("xml"), "csv");
	assert.equal(parseExportFormat(null), "csv");
	assert.equal(
		exportFileName("csv", new Date("2026-10-31T12:00:00Z")),
		"phibot-records-2026-10-31.csv",
	);
});
