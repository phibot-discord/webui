import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
	FOOLS_MANIFEST_KEY,
	foolsPack,
	foolsPackKey,
	foolsSummaries,
	loadFools,
	parseFoolsManifest,
	resetFoolsForTest,
} from "./fools";

const ID = "Oblivion.Daily天利.0";
const MANIFEST = {
	v: 1,
	songs: [
		{
			id: ID,
			song: "Oblivion:PHIN",
			composer: "Daily天利",
			jacket: true,
			charts: { SP: { label: "?", charter: "x", notes: 2026 } },
		},
	],
};

test("a manifest names songs, their charts and whether the jackets exist", () => {
	const [song] = parseFoolsManifest(MANIFEST);
	assert.equal(song?.id, ID);
	assert.equal(song?.jacket, true);
	assert.deepEqual(song?.charts, {
		SP: { label: "?", charter: "x", notes: 2026 },
	});
});

test("a bad song, level or version is dropped; the rest still loads", () => {
	assert.deepEqual(parseFoolsManifest({ v: 2, songs: MANIFEST.songs }), []);
	assert.deepEqual(parseFoolsManifest(null), []);
	assert.deepEqual(parseFoolsManifest({ v: 1 }), []);
	const songs = parseFoolsManifest({
		v: 1,
		songs: [
			null,
			{ id: "", song: "no id", charts: { IN: {} } },
			{ id: "a.0", song: "no charts", charts: {} },
			{ id: "b.0", song: "odd level", charts: { XX: { label: "?" } } },
			{
				id: "c.0",
				song: "ok",
				charts: { EZ: { notes: -3 }, AT: { label: " ", notes: 12.5 } },
			},
		],
	});
	assert.equal(songs.length, 1);
	assert.deepEqual(songs[0]?.charts, {
		EZ: { label: "?", charter: "", notes: null },
		AT: { label: "?", charter: "", notes: null },
	});
	assert.equal(songs[0]?.jacket, false);
});

test("catalog rows carry difficulty 0 and the label, so they cannot be scored", () => {
	const rows = foolsSummaries(parseFoolsManifest(MANIFEST));
	assert.deepEqual(rows, [
		{
			id: ID,
			song: "Oblivion:PHIN",
			composer: "Daily天利",
			charts: { SP: [0, 2026, "?"] },
		},
	]);
});

test("the manifest is read from R2 once per TTL, and packs resolve by id with or without .0", async () => {
	let hits = 0;
	const server = createServer((req, res) => {
		if (req.url === `/${FOOLS_MANIFEST_KEY}`) {
			hits += 1;
			res.end(JSON.stringify(MANIFEST));
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
	resetFoolsForTest();
	try {
		const pack = await foolsPack(ID, "SP");
		assert.deepEqual(pack, {
			filename: "Oblivion.Daily天利-SP.pez",
			key: "4-1/phira/SP/Oblivion.Daily天利-SP.pez",
		});
		assert.deepEqual(await foolsPack("Oblivion.Daily天利", "SP"), pack);
		assert.equal(await foolsPack(ID, "IN"), undefined);
		assert.equal(await foolsPack("Glaciaxion.SunsetRay.0", "SP"), undefined);
		assert.equal((await loadFools()).length, 1);
		assert.equal(hits, 1);
		const [song] = await loadFools();
		assert.ok(song);
		assert.equal(
			foolsPackKey(song, "SP"),
			"4-1/phira/SP/Oblivion.Daily天利-SP.pez",
		);
	} finally {
		process.env = env;
		resetFoolsForTest();
		server.closeAllConnections();
		server.close();
	}
});

test("no manifest in R2 means no specials, and a later upload is picked up", async () => {
	let published = false;
	const server = createServer((req, res) => {
		if (published && req.url === `/${FOOLS_MANIFEST_KEY}`) {
			res.end(JSON.stringify(MANIFEST));
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
	resetFoolsForTest();
	const realNow = Date.now;
	try {
		assert.deepEqual(await loadFools(), []);
		published = true;
		assert.deepEqual(await loadFools(), [], "a miss is kept for a minute");
		Date.now = () => realNow() + 61_000;
		assert.equal((await loadFools()).length, 1);
	} finally {
		Date.now = realNow;
		process.env = env;
		resetFoolsForTest();
		server.closeAllConnections();
		server.close();
	}
});
