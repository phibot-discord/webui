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

test("ids get the catalog's .0, and pack names stay those of the bare id", () => {
	const songs = parseFoolsManifest({
		v: 1,
		songs: [
			{
				id: " Burn(Haocore Mix) ",
				song: "Burn(Haocore Mix)",
				charts: { SP: { label: "?" } },
			},
			{ id: ID, song: "Oblivion:PHIN", charts: { SP: { label: "?" } } },
			{ id: " ", song: "blank id", charts: { SP: { label: "?" } } },
		],
	});
	assert.deepEqual(
		songs.map((s) => s.id),
		["Burn(Haocore Mix).0", ID],
	);
	const [burn, oblivion] = songs;
	assert.ok(burn && oblivion);
	assert.equal(
		foolsPackKey(burn, "SP"),
		"4-1/phira/SP/Burn(Haocore Mix)-SP.pez",
	);
	assert.equal(
		foolsPackKey(oblivion, "SP"),
		"4-1/phira/SP/Oblivion.Daily天利-SP.pez",
	);
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

test("catalog rows carry the song's aliases, and no empty list", () => {
	const songs = parseFoolsManifest({
		v: 1,
		songs: [
			...MANIFEST.songs,
			{ id: "Burn(Haocore Mix)", song: "Burn", charts: { SP: {} } },
		],
	});
	const rows = foolsSummaries(
		songs,
		new Map([
			[
				ID,
				[
					{ text: "2026愚人节", layer: "base" },
					{ text: "PHIN", layer: "approved" },
				],
			],
			["Burn(Haocore Mix).0", []],
		]),
	);
	assert.deepEqual(rows[0], {
		id: ID,
		song: "Oblivion:PHIN",
		composer: "Daily天利",
		aliases: ["2026愚人节", "PHIN"],
		charts: { SP: [0, 2026, "?"] },
	});
	assert.equal("aliases" in (rows[1] ?? {}), false);
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

async function settle(check: () => Promise<boolean>) {
	for (let i = 0; i < 200; i++) {
		if (await check()) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	assert.fail("the background read never landed");
}

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
		await settle(async () => (await loadFools()).length === 1);
	} finally {
		Date.now = realNow;
		process.env = env;
		resetFoolsForTest();
		server.closeAllConnections();
		server.close();
	}
});

test("an expired list is served at once while one read refreshes it", async () => {
	let hits = 0;
	let body: unknown = MANIFEST;
	let hold: Promise<void> | undefined;
	const server = createServer(async (req, res) => {
		if (req.url !== `/${FOOLS_MANIFEST_KEY}`) {
			res.statusCode = 404;
			res.end();
			return;
		}
		hits += 1;
		await hold;
		res.end(JSON.stringify(body));
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = `http://127.0.0.1:${port}`;
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	resetFoolsForTest();
	const realNow = Date.now;
	let release = () => {};
	try {
		const first = await loadFools();
		assert.equal(first.length, 1);
		body = {
			v: 1,
			songs: [
				...MANIFEST.songs,
				{ id: "Burn(Haocore Mix)", song: "Burn", charts: { SP: {} } },
			],
		};
		hold = new Promise<void>((resolve) => {
			release = resolve;
		});
		Date.now = () => realNow() + 5 * 60 * 1000 + 1_000;
		const served = await Promise.race([
			Promise.all([loadFools(), loadFools(), loadFools()]),
			new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error("waited on R2")), 1_000).unref();
			}),
		]);
		for (const songs of served) assert.equal(songs, first);
		release();
		await settle(async () => (await loadFools()).length === 2);
		assert.equal(hits, 2, "one background read, however many callers");
	} finally {
		release();
		Date.now = realNow;
		process.env = env;
		resetFoolsForTest();
		server.closeAllConnections();
		server.close();
	}
});
