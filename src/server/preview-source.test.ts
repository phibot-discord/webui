import assert from "node:assert/strict";
import test from "node:test";
import type { ChartSummary } from "./charts";
import { previewItem } from "./preview-source";

const LIST: ChartSummary[] = [
	{
		id: "Glaciaxion.SunsetRay.0",
		song: "Glaciaxion",
		composer: "SunsetRay",
		charts: { EZ: [1.5, 300], IN: [12.5, 900], AT: [0, null] },
	},
	{
		id: "Happy.Apollo",
		song: "Happy",
		composer: "Apollo",
		charts: { HD: [7.5, 500], AT: [15.8, 1300] },
	},
];

const PER_LEVEL = new Map([["Happy.Apollo", ["AT"]]]);

const links = (missing?: string) => (key: string) =>
	key === missing ? undefined : `https://cdn.test/${key}`;

test("a chart of the current game gets its chart, music and jacket addresses", () => {
	assert.deepEqual(
		previewItem(LIST, PER_LEVEL, links(), "Glaciaxion.SunsetRay.0", "IN"),
		{
			title: "Glaciaxion",
			path: "/songs/Glaciaxion-SunsetRay",
			level: "IN",
			constant: 12.5,
			source: {
				chart: "https://cdn.test/chart/Glaciaxion.SunsetRay/IN.json",
				pack: false,
				music: "https://cdn.test/music/Glaciaxion.SunsetRay.ogg",
				cover: "https://cdn.test/original_ill/illLow/Glaciaxion.SunsetRay.png",
			},
		},
	);
});

test("a song with a jacket per difficulty uses that difficulty's jacket", () => {
	assert.equal(
		previewItem(LIST, PER_LEVEL, links(), "Happy.Apollo", "AT")?.source.cover,
		"https://cdn.test/original_ill/illLow/AT/Happy.Apollo.png",
	);
	assert.equal(
		previewItem(LIST, PER_LEVEL, links(), "Happy.Apollo", "HD")?.source.cover,
		"https://cdn.test/original_ill/illLow/Happy.Apollo.png",
	);
});

test("an unknown song, an unknown level or a level without a constant gives nothing", () => {
	assert.equal(
		previewItem(LIST, PER_LEVEL, links(), "Nope.Nobody", "IN"),
		undefined,
	);
	assert.equal(
		previewItem(LIST, PER_LEVEL, links(), "Glaciaxion.SunsetRay.0", "SP"),
		undefined,
	);
	assert.equal(
		previewItem(LIST, PER_LEVEL, links(), "Glaciaxion.SunsetRay.0", "HD"),
		undefined,
	);
	assert.equal(
		previewItem(LIST, PER_LEVEL, links(), "Glaciaxion.SunsetRay.0", "AT"),
		undefined,
	);
});

test("a chart whose file or music is not published gives nothing", () => {
	assert.equal(
		previewItem(
			LIST,
			PER_LEVEL,
			links("chart/Happy.Apollo/AT.json"),
			"Happy.Apollo",
			"AT",
		),
		undefined,
	);
	assert.equal(
		previewItem(
			LIST,
			PER_LEVEL,
			links("music/Happy.Apollo.ogg"),
			"Happy.Apollo",
			"AT",
		),
		undefined,
	);
	const noJacket = previewItem(
		LIST,
		PER_LEVEL,
		links("original_ill/illLow/AT/Happy.Apollo.png"),
		"Happy.Apollo",
		"AT",
	);
	assert.equal(noJacket?.source.cover, undefined);
	assert.equal(
		noJacket?.source.chart,
		"https://cdn.test/chart/Happy.Apollo/AT.json",
	);
});
