import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { CHART_LEVELS } from "@/lib/chart-catalog";
import { PHIRA_LEVELS, packPhiraChart } from "./phira";

test("pez contains the chart, jacket, audio, and info.txt", async () => {
	const bytes = await packPhiraChart({
		id: "Stasis.Maozon",
		name: "Stasis",
		level: "IN",
		difficulty: "15.4",
		composer: "Maozon",
		illustrator: "someone",
		charter: "charter",
		chart: new TextEncoder().encode('{"format":"rpe"}'),
		picture: new Uint8Array([1, 2, 3]),
		song: new Uint8Array([4, 5]),
	});
	const zip = await JSZip.loadAsync(bytes);
	assert.deepEqual(
		Object.keys(zip.files).sort(),
		[
			"Stasis.Maozon.json",
			"Stasis.Maozon.ogg",
			"Stasis.Maozon.png",
			"info.txt",
		].sort(),
	);
	const info = await zip.file("info.txt")!.async("string");
	assert.match(info, /Level: IN Lv\.15\.4/);
	assert.match(info, /Charter: charter/);
	assert.equal(
		(await zip.file("Stasis.Maozon.png")!.async("uint8array")).length,
		3,
	);
});

test("the client's level list matches the Phira levels it names pack files with", () => {
	// AssetBrowser matches pack files to songs with CHART_LEVELS, so JSZip stays out of the page
	assert.deepEqual([...CHART_LEVELS], [...PHIRA_LEVELS]);
});
