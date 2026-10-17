import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import type { PvClip } from "@/lib/pv";
import { isGone, missingClips, resetPvForTest } from "./pv";

function clip(id: string): PvClip {
	return {
		id,
		name: id,
		group: "G",
		scene: "S",
		file: `pv/video/${id}.mp4`,
		size: 1,
		width: 1,
		height: 1,
		duration: 1,
		audio: true,
	};
}

test("only a 404 or 410 says a file is gone", () => {
	assert.equal(isGone(404), true);
	assert.equal(isGone(410), true);
	for (const status of [200, 206, 403, 429, 500, 502, 503]) {
		assert.equal(isGone(status), false, String(status));
	}
});

test("clips whose file R2 does not have are found, once per TTL", async () => {
	let hits = 0;
	const server = createServer((req, res) => {
		hits += 1;
		if (req.method !== "HEAD") res.statusCode = 405;
		else if (req.url === "/pv/video/there.mp4") res.statusCode = 200;
		else if (req.url === "/pv/video/gone.mp4") res.statusCode = 404;
		else if (req.url === "/pv/video/flaky.mp4") res.statusCode = 500;
		else res.statusCode = 404;
		res.end();
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = `http://127.0.0.1:${port}`;
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	resetPvForTest();
	try {
		const list = [clip("there"), clip("gone"), clip("flaky")];
		const missing = await missingClips(list);
		assert.deepEqual([...missing], ["gone"]);
		assert.ok(hits >= 3);
		const after = hits;
		assert.deepEqual([...(await missingClips(list))], ["gone"]);
		assert.equal(hits, after, "the answer is kept for the TTL");
		assert.deepEqual([...(await missingClips([clip("there")]))], []);
	} finally {
		process.env = env;
		resetPvForTest();
		server.closeAllConnections();
		server.close();
	}
});

test("a slow check does not hold up the page, and still lands for the next one", async () => {
	let release = () => {};
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const server = createServer(async (req, res) => {
		await gate;
		res.statusCode = req.url === "/pv/video/gone.mp4" ? 404 : 200;
		res.end();
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = `http://127.0.0.1:${port}`;
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	resetPvForTest();
	try {
		const list = [clip("there"), clip("gone")];
		const started = Date.now();
		const first = await missingClips(list, 100);
		assert.deepEqual(
			[...first],
			[],
			"nothing is hidden while the check is out",
		);
		assert.ok(Date.now() - started < 1500);
		release();
		for (let i = 0; i < 200; i++) {
			if ([...(await missingClips(list, 100))].length) break;
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		assert.deepEqual([...(await missingClips(list, 100))], ["gone"]);
	} finally {
		release();
		process.env = env;
		resetPvForTest();
		server.closeAllConnections();
		server.close();
	}
});
