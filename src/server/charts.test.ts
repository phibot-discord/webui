import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getInfo } from "../phi/lib/get-info";
import {
	type AliasEntry,
	resetAliasesForTest,
	setAliasDepsForTest,
} from "./aliases";
import {
	buildChartSnapshot,
	type ChartSummary,
	chartCatalog,
	chartCatalogWithFools,
	withSideTrees,
} from "./charts";
import {
	FOOLS_MANIFEST_KEY,
	foolsRows,
	parseFoolsManifest,
	resetFoolsForTest,
} from "./fools";

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

const FOOLS = {
	v: 1,
	songs: [
		{
			id: "A.x",
			song: "Song A",
			charts: { EZ: { label: "?" }, SP: { label: "?", notes: 99 } },
		},
		{
			id: "Z.z.0",
			song: "Song Z",
			composer: "Z",
			charts: { SP: { label: "?!" } },
		},
	],
};

test("4/1 rows join the catalog with their aliases; a listed song only gains the levels it lacks", async () => {
	await catalog();
	const aliases = new Map<string, AliasEntry[]>([
		["A.x.0", [{ text: "aa", layer: "base" }]],
		[
			"Z.z.0",
			[
				{ text: "ZSP", layer: "base" },
				{ text: "愚人节", layer: "approved" },
			],
		],
	]);
	const base = buildChartSnapshot("r1", aliases);
	const before = structuredClone(base.list);
	const snap = withSideTrees(base.list, aliases, [
		foolsRows(parseFoolsManifest(FOOLS)),
	]);
	assert.deepEqual(JSON.parse(snap.json), [
		{
			id: "A.x.0",
			song: "Song A",
			composer: "X",
			illustrator: "x",
			aliases: ["aa"],
			charts: {
				EZ: [1, null],
				HD: [5, null],
				IN: [10, null],
				SP: [0, 99, "?"],
			},
		},
		{ ...before[1], illustrator: "y" },
		{
			id: "Z.z.0",
			song: "Song Z",
			composer: "Z",
			aliases: ["ZSP", "愚人节"],
			charts: { SP: [0, null, "?!"] },
		},
	]);
	assert.deepEqual(base.list, before, "the scoring catalog is untouched");
	assert.match(snap.etag, /^"charts-[0-9a-f]{16}"$/);
	assert.notEqual(snap.etag, base.etag);
});

test("a listed song without a composer takes the 4/1 one when it gains a level", () => {
	const list: ChartSummary[] = [
		{ id: "Q.q.0", song: "Q", composer: "", charts: { IN: [12, null] } },
	];
	const before = structuredClone(list);
	const snap = withSideTrees(list, new Map(), [
		foolsRows(
			parseFoolsManifest({
				v: 1,
				songs: [
					{
						id: "Q.q",
						song: "Q",
						composer: "QQ",
						charts: { IN: { label: "!" }, SP: { label: "?" } },
					},
				],
			}),
		),
	]);
	assert.deepEqual(JSON.parse(snap.json), [
		{
			id: "Q.q.0",
			song: "Q",
			composer: "QQ",
			charts: { IN: [12, null], SP: [0, null, "?"] },
		},
	]);
	assert.deepEqual(list, before);
});

test("the 4/1 catalog is rebuilt only when the catalog or the manifest list changes", async () => {
	await catalog();
	const aliases = new Map<string, AliasEntry[]>();
	const base = buildChartSnapshot("r1", aliases);
	const songs = parseFoolsManifest(FOOLS);
	const one = withSideTrees(base.list, aliases, [foolsRows(songs)]);
	assert.equal(withSideTrees(base.list, aliases, [foolsRows(songs)]), one);
	const again = withSideTrees(base.list, aliases, [foolsRows([...songs])]);
	assert.notEqual(again, one);
	assert.equal(again.etag, one.etag);
	const nicks = new Map<string, AliasEntry[]>([
		["Z.z.0", [{ text: "ZSP", layer: "base" }]],
	]);
	assert.notEqual(
		withSideTrees(base.list, nicks, [foolsRows(songs)]).etag,
		one.etag,
	);
});

test("the catalog with fools adds the manifest's songs, and is the plain one plus illustrators without them", async () => {
	await catalog();
	let published = false;
	const server = createServer((req, res) => {
		if (published && req.url === `/${FOOLS_MANIFEST_KEY}`) {
			res.end(JSON.stringify(FOOLS));
			return;
		}
		res.statusCode = 404;
		res.end();
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = `http://127.0.0.1:${port}`;
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	setAliasDepsForTest({
		ensureCatalog: async () => {},
		catalogRevision: () => "fools-test",
		aliasesSha: () => undefined,
		readBase: () => ({ "Z.z": ["ZSP"] }),
		known: (id) => id === "Z.z.0" || id in getInfo.ori_info,
		background: () => {},
	});
	resetFoolsForTest();
	try {
		const base = await chartCatalog();
		const plain = await chartCatalogWithFools();
		assert.deepEqual(
			JSON.parse(plain.json),
			base.list.map((s) => ({
				...s,
				illustrator: getInfo.ori_info[s.id]?.illustrator,
			})),
		);
		published = true;
		resetFoolsForTest();
		const fools = await chartCatalogWithFools();
		const list = JSON.parse(fools.json) as unknown[];
		assert.equal(list.length, base.list.length + 1);
		assert.deepEqual(list.at(-1), {
			id: "Z.z.0",
			song: "Song Z",
			composer: "Z",
			aliases: ["ZSP"],
			charts: { SP: [0, null, "?!"] },
		});
		assert.equal((await chartCatalogWithFools()).etag, fools.etag);
	} finally {
		process.env = env;
		resetAliasesForTest();
		resetFoolsForTest();
		server.closeAllConnections();
		server.close();
	}
});
