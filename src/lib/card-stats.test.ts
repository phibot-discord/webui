import assert from "node:assert/strict";
import test from "node:test";
import {
	cardSource,
	encodeCardStats,
	formatDuration,
	parseCardStats,
} from "./card-stats";

test("parseCardStats round-trips a miss with paint split", () => {
	const raw = encodeCardStats({
		cache: "miss",
		cacheMs: 12.2,
		dataMs: 180,
		htmlMs: 900,
		assetsMs: 400,
		measureMs: 220,
		rasterMs: 19800,
		encodeMs: 310,
		paintMs: 21000,
		totalMs: 21450,
		heightCache: "hit",
	});
	const parsed = parseCardStats(raw);
	assert.equal(parsed?.cache, "miss");
	assert.equal(parsed?.heightCache, "hit");
	assert.equal(parsed?.rasterMs, 19800);
	assert.equal(parsed?.totalMs, 21450);
});

test("parseCardStats rejects junk", () => {
	assert.equal(parseCardStats(null), undefined);
	assert.equal(parseCardStats("{"), undefined);
	assert.equal(parseCardStats(JSON.stringify({ cache: "miss" })), undefined);
});

test("formatDuration stays compact", () => {
	assert.equal(formatDuration(48.2), "48ms");
	assert.equal(formatDuration(1540), "1.54s");
	assert.equal(formatDuration(21450), "21.5s");
});

test("cardSource splits R2, KV, and rendering", () => {
	assert.equal(
		cardSource({ cache: "miss", cacheMs: 10, totalMs: 20 }),
		"render",
	);
	assert.equal(
		cardSource({ cache: "hit", store: "r2", cacheMs: 10, totalMs: 20 }),
		"r2",
	);
	assert.equal(
		cardSource({ cache: "hit", store: "kv", cacheMs: 10, totalMs: 20 }),
		"kv",
	);
	assert.equal(
		cardSource({ cache: "hit", store: "mem", cacheMs: 10, totalMs: 20 }),
		"r2",
	);
});

test("parseCardStats keeps the prep phase and revalidation flag, and older headers still parse", () => {
	const parsed = parseCardStats(
		encodeCardStats({
			cache: "hit",
			revalidated: true,
			prepMs: 85,
			cacheMs: 0,
			totalMs: 90,
		}),
	);
	assert.ok(parsed);
	assert.equal(parsed.prepMs, 85);
	assert.equal(parsed.revalidated, true);
	assert.equal(
		cardSource(parsed),
		"browser",
		"a 304: the browser showed its own copy",
	);
	const legacy = parseCardStats(
		JSON.stringify({ cache: "hit", store: "r2", cacheMs: 3, totalMs: 9 }),
	);
	assert.equal(legacy?.prepMs, undefined);
});

test("a joined request's stats keep the shared flag", () => {
	const parsed = parseCardStats(
		encodeCardStats({
			cache: "miss",
			shared: true,
			prepMs: 40,
			cacheMs: 6000,
			totalMs: 6100,
		}),
	);
	assert.ok(parsed);
	assert.equal(parsed.shared, true);
	assert.equal(parsed.dataMs, undefined);
	assert.equal(cardSource(parsed), "render");
});
