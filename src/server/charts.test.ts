import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getInfo } from "../phi/lib/get-info";
import type { AliasEntry } from "./aliases";
import { buildChartSnapshot } from "./charts";

const CSV_HEAD =
	"id\tsong\tcomposer\tillustrator\tEZC\tHDC\tINC\tATC\tEZ\tHD\tIN\tAT\n";

async function catalog() {
	const assets = mkdtempSync(join(tmpdir(), "phi-charts-"));
	mkdirSync(join(assets, "info"), { recursive: true });
	writeFileSync(
		join(assets, "info", "info.csv"),
		`${CSV_HEAD}A.x\tSong A\tX\tx\t\t\t\t\t1\t5\t10\t\nB.y\tSong B\tY\ty\t\t\t\t\t2\t6\t11\t15\n`,
	);
	await getInfo.init(assets);
}

test("chart snapshot carries aliases only for songs that have them", async () => {
	await catalog();
	const aliases = new Map<string, AliasEntry[]>([
		[
			"A.x.0",
			[
				{ text: "aa", layer: "base" },
				{ text: "啊", layer: "approved" },
			],
		],
		["B.y.0", []],
	]);
	const snap = buildChartSnapshot("r1", aliases);
	assert.deepEqual(snap.list[0], {
		id: "A.x.0",
		song: "Song A",
		composer: "X",
		aliases: ["aa", "啊"],
		charts: { EZ: [1, null], HD: [5, null], IN: [10, null] },
	});
	assert.equal("aliases" in (snap.list[1] ?? {}), false);
	assert.equal(snap.json.includes('"aliases":[]'), false);
	assert.match(snap.etag, /^"charts-[0-9a-f]{16}"$/);
});

test("the chart ETag moves when the aliases do", async () => {
	await catalog();
	const one = buildChartSnapshot(
		"r1",
		new Map([["A.x.0", [{ text: "aa", layer: "base" }]]]),
	);
	const same = buildChartSnapshot(
		"r1",
		new Map([["A.x.0", [{ text: "aa", layer: "base" }]]]),
	);
	const two = buildChartSnapshot(
		"r2",
		new Map([
			[
				"A.x.0",
				[
					{ text: "aa", layer: "base" },
					{ text: "new", layer: "approved" },
				],
			],
		]),
	);
	assert.equal(one.etag, same.etag);
	assert.notEqual(one.etag, two.etag);
	assert.notEqual(one.etag, buildChartSnapshot("r0", new Map()).etag);
});

test("an id in both ori_info and sp_info is listed once", async () => {
	const assets = mkdtempSync(join(tmpdir(), "phi-charts-"));
	mkdirSync(join(assets, "info"), { recursive: true });
	writeFileSync(
		join(assets, "info", "info.csv"),
		`${CSV_HEAD}Introduction\tIntroduction\t\tx\t\t\t\t\t1\t\t\t\n`,
	);
	writeFileSync(
		join(assets, "info", "spinfo.json"),
		JSON.stringify({
			Introduction: {
				song: "Introduction",
				composer: "姜米條&ElousΛ.-FZ",
				chart: { EZ: { difficulty: 1, combo: 93 }, AT: { difficulty: 9 } },
			},
		}),
	);
	await getInfo.init(assets);
	assert.ok(getInfo.ori_info["Introduction.0"]);
	assert.ok(getInfo.sp_info["Introduction.0"]);
	const snap = buildChartSnapshot("r1", new Map());
	assert.deepEqual(snap.list, [
		{
			id: "Introduction.0",
			song: "Introduction",
			composer: "姜米條&ElousΛ.-FZ",
			charts: { EZ: [1, null], AT: [9, null] },
		},
	]);
});
