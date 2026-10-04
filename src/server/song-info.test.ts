import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Catalog } from "../phi/lib/catalog";
import { getInfo } from "../phi/lib/get-info";
import { parseInfoFileCache } from "../phi/lib/info-file";
import {
	applyLevelsCsv,
	applyNotesInfo,
	catalogRevision,
	hydrateSongInfo,
	INFO_STATE_KEY,
	resetSongInfoForTest,
} from "./song-info";
import { readFile } from "./vfs";

function tmp() {
	return mkdtempSync(join(tmpdir(), "phi-info-"));
}

function objects(map: Record<string, string>) {
	return async (key: string) => {
		const v = map[key];
		return v == null ? undefined : Buffer.from(v);
	};
}

const CSV_HEAD =
	"id\tsong\tcomposer\tillustrator\tEZC\tHDC\tINC\tATC\tEZ\tHD\tIN\tAT\n";

test("hydrateSongInfo mounts complete R2 catalog over bundled files", async () => {
	resetSongInfoForTest();
	const assets = tmp();
	const cache = tmp();
	const info = join(assets, "info");
	mkdirSync(info, { recursive: true });
	writeFileSync(join(info, "info.csv"), "bundled-csv");
	writeFileSync(join(info, "tips.txt"), "bundled-tips");

	const result = await hydrateSongInfo({
		getObject: objects({
			[INFO_STATE_KEY]: JSON.stringify({
				commit: "abc123",
				pending: 0,
				phigros: "3.20.0",
				phigrosVerNum: 154,
			}),
			"info/info.csv": "id\tsong\nNWAD.Knighthood\tNWAD\n",
			"info/tips.txt": "from-r2",
		}),
		assetsDir: assets,
		cacheRoot: cache,
		files: ["info.csv", "tips.txt"],
	});

	assert.equal(result.commit, "abc123");
	assert.equal(result.phigros, "3.20.0");
	assert.equal(result.phigrosVerNum, 154);
	assert.equal(catalogRevision(), "abc123");
	assert.equal(
		readFile(join(info, "info.csv"), "utf8"),
		"id\tsong\nNWAD.Knighthood\tNWAD\n",
	);
	assert.equal(readFile(join(info, "tips.txt"), "utf8"), "from-r2");
	assert.equal(
		readFileSync(join(cache, "info.csv"), "utf8"),
		"id\tsong\nNWAD.Knighthood\tNWAD\n",
	);
});

test("hydrateSongInfo skips file downloads when the cached commit matches", async () => {
	resetSongInfoForTest();
	const assets = tmp();
	const cache = tmp();
	mkdirSync(join(assets, "info"), { recursive: true });
	await hydrateSongInfo({
		getObject: objects({
			[INFO_STATE_KEY]: JSON.stringify({ commit: "abc123", pending: 0 }),
			"info/info.csv": "one",
		}),
		assetsDir: assets,
		cacheRoot: cache,
		files: ["info.csv"],
	});

	const keys: string[] = [];
	await hydrateSongInfo({
		getObject: async (key) => {
			keys.push(key);
			if (key === INFO_STATE_KEY) {
				return Buffer.from(JSON.stringify({ commit: "abc123", pending: 0 }));
			}
			throw new Error(`unexpected fetch ${key}`);
		},
		assetsDir: assets,
		cacheRoot: cache,
		files: ["info.csv"],
	});

	assert.deepEqual(keys, [INFO_STATE_KEY]);
	assert.equal(readFile(join(assets, "info", "info.csv"), "utf8"), "one");
});

test("hydrateSongInfo downloads catalog files in parallel", async () => {
	resetSongInfoForTest();
	const assets = tmp();
	const cache = tmp();
	mkdirSync(join(assets, "info"), { recursive: true });
	let inflight = 0;
	let max = 0;
	const result = await hydrateSongInfo({
		getObject: async (key) => {
			if (key === INFO_STATE_KEY) {
				return Buffer.from(JSON.stringify({ commit: "par", pending: 0 }));
			}
			inflight += 1;
			max = Math.max(max, inflight);
			await new Promise((r) => setTimeout(r, 25));
			inflight -= 1;
			return Buffer.from(key);
		},
		assetsDir: assets,
		cacheRoot: cache,
		files: ["a.txt", "b.txt", "c.txt"],
	});
	assert.equal(result.commit, "par");
	assert.ok(max >= 3, `expected parallel fetches, max inflight ${max}`);
	assert.equal(readFile(join(assets, "info", "a.txt"), "utf8"), "info/a.txt");
});

test("hydrateSongInfo keeps bundled files when sync is pending or missing", async () => {
	resetSongInfoForTest();
	const assets = tmp();
	const cache = tmp();
	mkdirSync(join(assets, "info"), { recursive: true });
	writeFileSync(join(assets, "info", "info.csv"), "bundled-csv");

	const pending = await hydrateSongInfo({
		getObject: objects({
			[INFO_STATE_KEY]: JSON.stringify({ commit: "abc123", pending: 3 }),
			"info/info.csv": "partial",
		}),
		assetsDir: assets,
		cacheRoot: cache,
		files: ["info.csv"],
	});
	assert.equal(pending.commit, "bundled");
	assert.equal(
		readFile(join(assets, "info", "info.csv"), "utf8"),
		"bundled-csv",
	);

	resetSongInfoForTest();
	const missing = await hydrateSongInfo({
		getObject: async () => undefined,
		assetsDir: assets,
		cacheRoot: cache,
		files: ["info.csv"],
	});
	assert.equal(missing.commit, "bundled");
	assert.equal(catalogRevision(), "bundled");
});

test("hydrateSongInfo re-downloads when levelsSha changes with the same git commit", async () => {
	resetSongInfoForTest();
	const assets = tmp();
	const cache = tmp();
	mkdirSync(join(assets, "info"), { recursive: true });
	await hydrateSongInfo({
		getObject: objects({
			[INFO_STATE_KEY]: JSON.stringify({
				commit: "abc123",
				pending: 0,
				levelsSha: "old",
			}),
			"info/info.csv": "stale",
		}),
		assetsDir: assets,
		cacheRoot: cache,
		files: ["info.csv"],
	});

	const result = await hydrateSongInfo({
		getObject: objects({
			[INFO_STATE_KEY]: JSON.stringify({
				commit: "abc123",
				pending: 0,
				levelsSha: "new",
			}),
			"info/info.csv": "fresh",
		}),
		assetsDir: assets,
		cacheRoot: cache,
		files: ["info.csv"],
	});
	assert.equal(result.commit, "abc123");
	assert.equal(result.levelsSha, "new");
	assert.equal(catalogRevision(), "abc123:new");
	assert.equal(readFile(join(assets, "info", "info.csv"), "utf8"), "fresh");
});

test("applyLevelsCsv mounts KV csv over R2 and updates catalogRevision", async () => {
	resetSongInfoForTest();
	const assets = tmp();
	mkdirSync(join(assets, "info"), { recursive: true });
	writeFileSync(join(assets, "info", "info.csv"), "from-r2");
	const csv = `${CSV_HEAD}Credits.Frums\tCredits\tx\tx\t\t\t\t_鉄\t4.5\t10.4\t13.6\t15.8\n`;
	const cache = parseInfoFileCache(
		JSON.stringify({
			sha: "deadbeef",
			csv,
			songs: 1,
			maxDifficulty: 15.8,
			updatedAt: "2026-09-12T00:00:00.000Z",
		}),
	);
	assert.ok(cache);
	applyLevelsCsv(assets, cache);
	assert.equal(readFile(join(assets, "info", "info.csv"), "utf8"), csv);
	assert.equal(catalogRevision().endsWith(":deadbeef"), true);
	await getInfo.init(assets);
	assert.equal(getInfo.ori_info["Credits.Frums.0"]?.chart.AT?.difficulty, 15.8);
});

test("notesInfo mounted with the KV csv supplies combo for a song the bundle lacks", async () => {
	const assets = tmp();
	mkdirSync(join(assets, "info"), { recursive: true });
	writeFileSync(
		join(assets, "info", "info.csv"),
		`${CSV_HEAD}ExoplanetaryMirage.x\tExoplanetary Mirage\tx\tx\t\t\t\t\t8.7\t13.4\t16.9\t17.9\n`,
	);
	writeFileSync(join(assets, "info", "notesInfo.json"), "{}");
	applyNotesInfo(
		assets,
		Buffer.from(
			JSON.stringify({
				"ExoplanetaryMirage.x": {
					EZ: { t: [131, 429, 73, 37], m: 1 },
					AT: { t: [1152, 538, 211, 176], m: 1 },
				},
			}),
		),
	);
	await getInfo.init(assets);
	assert.equal(
		getInfo.ori_info["ExoplanetaryMirage.x.0"]?.chart.EZ?.combo,
		670,
	);
	assert.equal(
		getInfo.ori_info["ExoplanetaryMirage.x.0"]?.chart.AT?.combo,
		2077,
	);
});

test("getInfo.init replaces songs so a newer info.csv can drop old ids", async () => {
	const assets = tmp();
	mkdirSync(join(assets, "info"), { recursive: true });
	writeFileSync(
		join(assets, "info", "info.csv"),
		`${CSV_HEAD}Old.Song\tOld\tx\tx\t\t\t\t\t1\t2\t3\t\n`,
	);
	await getInfo.init(assets);
	assert.equal("Old.Song.0" in getInfo.ori_info, true);
	assert.deepEqual(getInfo.chartTotals(), [1, 1, 1, 0]);
	writeFileSync(
		join(assets, "info", "info.csv"),
		`${CSV_HEAD}NWAD.Knighthood\tNWAD\tx\tx\t\t\t\t\t5.5\t9.2\t15.6\t\n`,
	);
	await getInfo.init(assets);
	assert.equal("Old.Song.0" in getInfo.ori_info, false);
	assert.equal("NWAD.Knighthood.0" in getInfo.ori_info, true);
	const catalog = new Catalog(assets);
	assert.equal(catalog.size, 1);
	assert.ok(catalog.randomIll("blur").endsWith("illBlur/NWAD.Knighthood.png"));
});
