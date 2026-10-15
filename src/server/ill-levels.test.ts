import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
	illLevelsKey,
	loadIllLevels,
	parseIllLevels,
	resetIllLevelsForTest,
} from "./ill-levels";

const MANIFEST = {
	v: 1,
	songs: { "Happy.Apollo": ["AT", "EZ", "IN", "HD"] },
};

test("the manifest lists each song's levels in chart order", () => {
	assert.deepEqual(
		[...parseIllLevels(MANIFEST)],
		[["Happy.Apollo", ["EZ", "HD", "IN", "AT"]]],
	);
});

test("a bad version, song or level is dropped; the rest still loads", () => {
	assert.equal(parseIllLevels({ v: 2, songs: MANIFEST.songs }).size, 0);
	assert.equal(parseIllLevels(null).size, 0);
	assert.equal(parseIllLevels({ v: 1 }).size, 0);
	assert.equal(parseIllLevels({ v: 1, songs: [] }).size, 0);
	const levels = parseIllLevels({
		v: 1,
		songs: {
			"": ["IN"],
			"No.Levels": [],
			"Odd.Levels": ["SP", "XX", 3],
			"Not.AList": "IN",
			"Ok.One": ["SP", "IN"],
		},
	});
	assert.deepEqual([...levels], [["Ok.One", ["IN"]]]);
});

test("the manifest sits next to the jackets, whatever their prefix is", () => {
	assert.equal(illLevelsKey("original_ill"), "original_ill/levels.json");
	assert.equal(illLevelsKey("jackets/v2"), "jackets/v2/levels.json");
	assert.equal(illLevelsKey(""), "levels.json");
});

test("the manifest is read from R2 once per TTL; a missing one means no per-difficulty jackets", async () => {
	let hits = 0;
	let published = true;
	const server = createServer((req, res) => {
		if (published && req.url === `/${illLevelsKey("original_ill")}`) {
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
	delete process.env.CLOUDFLARE_R2_ILL_PREFIX;
	resetIllLevelsForTest();
	const realNow = Date.now;
	try {
		assert.deepEqual(
			[...(await loadIllLevels())],
			[["Happy.Apollo", ["EZ", "HD", "IN", "AT"]]],
		);
		assert.equal((await loadIllLevels()).size, 1);
		assert.equal(hits, 1);
		// A read that fails later keeps the last good set
		published = false;
		Date.now = () => realNow() + 6 * 60_000;
		assert.equal((await loadIllLevels()).size, 1, "served while it refreshes");
	} finally {
		Date.now = realNow;
		process.env = env;
		resetIllLevelsForTest();
		server.closeAllConnections();
		server.close();
	}
});
