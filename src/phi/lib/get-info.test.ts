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
	getInfo.setSide("fools", [
		["Special.One.0", "Special.One"],
		["Igallta.SeURa", "Igallta.SeURa"],
	]);
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
		getInfo.setSide("fools", []);
	}
});

test("getill gives a chart its own jacket only for a song the manifest lists with that level", async () => {
	await getInfo.init(
		assets({
			"spinfo.json": JSON.stringify({
				"Special.One": { song: "Special", chapter: "SP", chart: {} },
			}),
		}),
	);
	const root = getInfo.originalIll;
	const plain = `${root}/ill/Igallta.SeURa.png`;
	try {
		// No manifest: every level gets the song's jacket
		assert.equal(getInfo.getill("Igallta.SeURa.0", "common", "IN"), plain);
		getInfo.setIllLevels(new Map([["Igallta.SeURa", ["EZ", "IN"]]]));
		assert.equal(
			getInfo.getill("Igallta.SeURa.0", "common", "IN"),
			`${root}/ill/IN/Igallta.SeURa.png`,
		);
		assert.equal(
			getInfo.getill("Igallta.SeURa", "low", "EZ"),
			`${root}/illLow/EZ/Igallta.SeURa.png`,
		);
		assert.equal(
			getInfo.getill("Igallta.SeURa.0", "blur", "EZ"),
			`${root}/illBlur/EZ/Igallta.SeURa.png`,
		);
		// A level the song lacks, no level, or a level that is not a chart falls back to the song's
		assert.equal(getInfo.getill("Igallta.SeURa.0", "common", "AT"), plain);
		assert.equal(getInfo.getill("Igallta.SeURa.0", "common"), plain);
		assert.equal(getInfo.getill("Igallta.SeURa.0", "common", "SP"), plain);
		// Another song, and a special in the SP or 4/1 tree, never get one
		assert.equal(
			getInfo.getill("Special.One.0", "low", "IN"),
			`${root}/SP/Special.One.png`,
		);
		getInfo.setIllLevels(new Map([["Special.One", ["IN"]]]));
		assert.equal(
			getInfo.getill("Special.One.0", "low", "IN"),
			`${root}/SP/Special.One.png`,
		);
		getInfo.setSide("fools", [["Special.One", "Special.One"]]);
		assert.equal(
			getInfo.getill("Special.One.0", "low", "IN"),
			`${root}/4-1/illLow/Special.One.png`,
		);
	} finally {
		getInfo.setSide("fools", []);
		getInfo.setIllLevels(new Map());
	}
});

test("getill gives an id without .0 the same path as the catalog id, in every tree", async () => {
	await getInfo.init(
		assets({
			"spinfo.json": JSON.stringify({
				"Special.One": { song: "Special", chapter: "SP", chart: {} },
			}),
		}),
	);
	const root = getInfo.originalIll;
	assert.equal(
		getInfo.getill("Igallta.SeURa", "low"),
		`${root}/illLow/Igallta.SeURa.png`,
	);
	assert.equal(
		getInfo.getill("Special.One", "common"),
		`${root}/SP/Special.One.png`,
	);
	// A special the manifest lists that spinfo.json no longer has
	getInfo.setSide("fools", [
		["Special.One", "Special.One"],
		[
			"Retribution ~ Cycle of Redemption ~",
			"Retribution ~ Cycle of Redemption ~",
		],
	]);
	try {
		assert.equal(
			getInfo.getill("Special.One", "low"),
			`${root}/4-1/illLow/Special.One.png`,
		);
		assert.equal(
			getInfo.getill("Special.One", "low"),
			getInfo.getill("Special.One.0", "low"),
		);
		// A save background with no catalog id falls back to its name
		assert.equal(
			getInfo.getBackground("Retribution ~ Cycle of Redemption ~"),
			`${root}/4-1/ill/Retribution ~ Cycle of Redemption ~.png`,
		);
		assert.equal(
			getInfo.getBackground("Special"),
			`${root}/4-1/ill/Special.One.png`,
		);
	} finally {
		getInfo.setSide("fools", []);
	}
	assert.equal(
		getInfo.getBackground("Not.A.Song"),
		`${root}/ill/Not.A.Song.png`,
	);
});

test("a side tree's jackets go by the stem its manifest gives, not the catalog id", () => {
	getInfo.setSide("fools", [["Burn(Haocore Mix).0", "BurnHaocoreMix"]]);
	getInfo.setSide("removed", [
		["Destination.0", "Destinaion.姜米條vsRocketLant"],
	]);
	try {
		assert.match(
			getInfo.getill("Burn(Haocore Mix)", "low").replace(/\\/g, "/"),
			/\/4-1\/illLow\/BurnHaocoreMix\.png$/,
		);
		assert.match(
			getInfo.getill("Destination.0", "common").replace(/\\/g, "/"),
			/\/removed\/ill\/Destinaion\.姜米條vsRocketLant\.png$/,
		);
	} finally {
		getInfo.setSide("fools", []);
		getInfo.setSide("removed", []);
	}
});

test("card avatars use the ripper's file for each name, then the built-in exceptions", async () => {
	await getInfo.init(
		assets({
			"avatar.txt": "Glaciaxion\nFeast远东之宴1\nCipher : /2&//<|0\n",
			"avatars.json": JSON.stringify([
				{ addressable_key: "avatar.Glaciaxion", name: "Glaciaxion" },
				{ addressable_key: "avatar.Feast1", name: "Feast远东之宴1" },
			]),
		}),
	);
	assert.equal(getInfo.idgetavatar("Feast远东之宴1"), "Feast1");
	assert.equal(getInfo.idgetavatar("Glaciaxion"), "Glaciaxion");
	assert.equal(getInfo.idgetavatar("Cipher : /2&//<|0"), "Cipher1");
	assert.equal(getInfo.idgetavatar("Unknown"), "Introduction");
	await getInfo.init(assets({ "avatar.txt": "Feast远东之宴1\n" }));
	assert.equal(getInfo.idgetavatar("Feast远东之宴1"), "Feast远东之宴1");
});
