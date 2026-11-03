import assert from "node:assert/strict";
import test from "node:test";
import { collectSongAssets } from "./song-assets";

const keys = [
	"chart/Song.A/IN.json",
	"chart/Song.A/AT.json",
	"phira/IN/Song.A-IN.pez",
	"music/Song.A.ogg",
	"original_ill/ill/Song.A.png",
	"original_ill/illLow/Song.A.png",
	"original_ill/illBlur/Song.A.png",
	"original_ill/illLow/AT/Song.A.png",
	"history/1.2.0/chart/Song.A/IN.json",
	"history/1.2.0/phira/IN/Song.A-IN.pez",
	"history/2.0.0/chart/Song.A/IN.json",
	"removed/chart/Song.A/Legacy.json",
	"removed/phira/Legacy/Song.A-Legacy.pez",
	"4-1/phira/SP/Song.A-SP.pez",
	"4-1/music/Song.A.ogg",
	"chart/Other.B/IN.json",
	"music/Other.B.ogg",
	"original_ill/illLow/Song.AB.png",
];

const files = keys.map((key) => ({ key, size: 10 }));
const link = (key: string) => `https://r2.example/${key}`;

test("collects every tree's charts, music and art for one song", () => {
	const got = collectSongAssets(files, new Set(["Song.A"]), link, {
		history: {
			eras: [
				{
					versions: ["1.2.0", "1.4.1"],
					charts: { IN: { label: "12", notes: 1, charter: "", rev: "1.2.0" } },
				},
			],
		},
		removedFrom: { Legacy: "2.1.4" },
	});
	assert.deepEqual(
		got.charts.map((c) => c.id),
		["current", "history:2.0.0", "history:1.2.0", "removed", "fools"],
	);
	assert.deepEqual(
		got.charts[0]?.levels.map((l) => l.rank),
		["IN", "AT"],
	);
	assert.deepEqual(got.charts[2]?.versions, ["1.2.0", "1.4.1"]);
	assert.equal(got.music.length, 2);
	assert.deepEqual(
		got.art.map((a) => `${a.variant}${a.level ? `:${a.level}` : ""}`),
		["ill", "illLow", "illBlur", "illLow:AT"],
	);
	assert.ok(!got.art.some((a) => a.key.includes("Song.AB")));
	assert.ok(
		!got.charts.some((c) =>
			c.levels.some((l) => l.json?.key.includes("Other")),
		),
	);
});

test("preview sources: JSON where it exists, packs only for 4/1, right music and cover", () => {
	const got = collectSongAssets(files, new Set(["Song.A"]), link, {
		removedFrom: { Legacy: "2.1.4" },
	});
	const byId = Object.fromEntries(got.preview.map((v) => [v.id, v]));
	const at = byId.current?.levels.find((l) => l.rank === "AT");
	assert.equal(at?.source.chart, link("chart/Song.A/AT.json"));
	assert.equal(at?.source.pack, false);
	assert.equal(at?.source.music, link("music/Song.A.ogg"));
	assert.equal(at?.source.cover, link("original_ill/illLow/AT/Song.A.png"));
	assert.equal(
		byId["history:1.2.0"]?.levels[0]?.source.music,
		link("music/Song.A.ogg"),
	);
	assert.equal(byId.removed?.levels[0]?.from, "2.1.4");
	const sp = byId.fools?.levels[0];
	assert.equal(sp?.source.pack, true);
	assert.equal(sp?.source.chart, link("4-1/phira/SP/Song.A-SP.pez"));
	assert.equal(sp?.source.music, link("4-1/music/Song.A.ogg"));
});

test("download names carry the level and version", () => {
	const got = collectSongAssets(files, new Set(["Song.A"]), link);
	const names = got.charts.flatMap((c) =>
		c.levels.flatMap((l) => [l.json?.name, l.pack?.name].filter(Boolean)),
	);
	assert.ok(names.includes("Song.A-IN.json"));
	assert.ok(names.includes("Song.A-IN-v1.2.0.json"));
	assert.ok(names.includes("Song.A-IN-v1.2.0.pez"));
	assert.ok(names.includes("Song.A-Legacy-removed.json"));
	assert.ok(names.includes("Song.A-SP-fools.pez"));
	assert.ok(got.art.some((a) => a.name === "Song.A-AT-illLow.png"));
});
