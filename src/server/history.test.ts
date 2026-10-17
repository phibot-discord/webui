import assert from "node:assert/strict";
import test from "node:test";
import {
	assetKind,
	assetTab,
	chartJsonOf,
	packOf,
	splitTree,
} from "../lib/assets";
import { parseHistoryManifest } from "./history";

const MANIFEST = {
	v: 1,
	versions: ["1.4.1", "2.1.4", "4.0.1"],
	songs: [
		{
			id: "A.x",
			current: ["2.1.4", "4.0.1"],
			eras: [
				{
					versions: ["1.4.1"],
					charts: {
						EZ: { label: "1.0", notes: 124, charter: "c", rev: "1.4.1" },
						HD: { label: "6.5", notes: 393, charter: "d" },
						"not a level": { label: "x" },
					},
				},
				{ versions: [], charts: { EZ: { label: "1" } } },
			],
		},
		{ id: "B.y", current: ["4.0.1"], eras: [] },
		{ id: "", eras: [{ versions: ["1.4.1"], charts: { EZ: {} } }] },
	],
};

test("history manifest keeps eras with versions and known levels, and adds `.0`", () => {
	const songs = parseHistoryManifest(MANIFEST);
	assert.equal(songs.length, 1);
	const [a] = songs;
	assert.equal(a?.id, "A.x.0");
	assert.deepEqual(a?.current, ["2.1.4", "4.0.1"]);
	assert.equal(a?.eras.length, 1);
	assert.deepEqual(a?.eras[0]?.charts, {
		EZ: { label: "1.0", notes: 124, charter: "c", rev: "1.4.1" },
		HD: { label: "6.5", notes: 393, charter: "d" },
	});
	assert.deepEqual(parseHistoryManifest({ v: 2, songs: [] }), []);
});

test("history/<apk>/ is a side tree: kinds, packs and chart JSON read through it", () => {
	const pack = "history/2.1.4/phira/EZ/A.x-EZ.pez";
	assert.deepEqual(splitTree(pack), ["history/2.1.4/", "phira/EZ/A.x-EZ.pez"]);
	assert.equal(assetTab(pack), "history");
	assert.equal(assetTab("history/index.json"), "history");
	assert.equal(assetKind(pack), "chart");
	assert.deepEqual(packOf(pack)?.stem, "A.x");
	assert.equal(chartJsonOf("history/2.1.4/chart/A.x.0/EZ.json")?.stem, "A.x");
	assert.deepEqual(splitTree("historyx/a"), ["", "historyx/a"]);
});
