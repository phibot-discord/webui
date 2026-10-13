import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getInfo, withDotZero } from "./get-info";

const CSV_HEAD =
	"id\tsong\tcomposer\tillustrator\tEZC\tHDC\tINC\tATC\tEZ\tHD\tIN\tAT\n";

function assets(files: Record<string, string>): string {
	const dir = mkdtempSync(join(tmpdir(), "phi-getinfo-"));
	mkdirSync(join(dir, "info"), { recursive: true });
	writeFileSync(
		join(dir, "info", "info.csv"),
		`${CSV_HEAD}Igallta.SeURa\tIgallta\tSe-U-Ra\tx\t\t\t\t\t3\t9\t14\t16.4\n`,
	);
	for (const [name, body] of Object.entries(files)) {
		writeFileSync(join(dir, "info", name), body);
	}
	return dir;
}

test("withDotZero is idempotent", () => {
	assert.equal(withDotZero("Igallta.SeURa"), "Igallta.SeURa.0");
	assert.equal(withDotZero("Igallta.SeURa.0"), "Igallta.SeURa.0");
});

test("getill sends a listed 4/1 special to its own jackets, and only while it is not a normal song", async () => {
	await getInfo.init(
		assets({
			"spinfo.json": JSON.stringify({
				"Special.One": { song: "Special", chapter: "SP", chart: {} },
			}),
		}),
	);
	const root = getInfo.originalIll;
	assert.equal(
		getInfo.getill("Special.One.0", "low"),
		`${root}/SP/Special.One.png`,
	);
	getInfo.setFools(["Special.One.0", "Igallta.SeURa"]);
	try {
		assert.equal(
			getInfo.getill("Special.One.0", "low"),
			`${root}/4-1/illLow/Special.One.png`,
		);
		assert.equal(
			getInfo.getill("Special.One.0", "common"),
			`${root}/4-1/ill/Special.One.png`,
		);
		// In info.csv: the normal jacket wins
		assert.equal(
			getInfo.getill("Igallta.SeURa.0", "low"),
			`${root}/illLow/Igallta.SeURa.png`,
		);
	} finally {
		getInfo.setFools([]);
	}
});
