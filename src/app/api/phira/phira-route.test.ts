import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

// No Cloudflare: the catalog check reads KV through this stub, and R2 is a local server
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	store: { get: async () => undefined },
});

test("a pack is piped from R2 with its download name and length", async () => {
	const body = Buffer.alloc(256 * 1024, 7);
	const server = createServer((req, res) => {
		if (req.url === "/phira/IN/Glaciaxion.SunsetRay-IN.pez") {
			res.setHeader("content-length", String(body.length));
			res.end(body);
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
	try {
		const { GET } = await import("./route");
		const res = await GET(
			new Request(
				"http://localhost/api/phira?id=Glaciaxion.SunsetRay.0&level=IN",
			),
		);
		assert.equal(res.status, 200);
		assert.equal(res.headers.get("content-length"), String(body.length));
		assert.match(
			res.headers.get("content-disposition") ?? "",
			/^attachment; filename="Glaciaxion\.SunsetRay-IN\.pez"/,
		);
		assert.equal(res.headers.get("cache-control"), "private, no-store");
		assert.ok(res.body, "a stream, not a buffered body");
		assert.deepEqual(Buffer.from(await res.arrayBuffer()), body);

		const missing = await GET(
			new Request(
				"http://localhost/api/phira?id=Glaciaxion.SunsetRay.0&level=EZ",
			),
		);
		assert.equal(missing.status, 404);
		const bad = await GET(
			new Request("http://localhost/api/phira?id=x&level=XX"),
		);
		assert.equal(bad.status, 400);
	} finally {
		process.env = env;
		server.closeAllConnections();
		server.close();
	}
});

test("a 4/1 special has no constant but its pack is piped from 4-1/", async () => {
	const id = "OblivionPHIN.Daily天利vsEndCat终猫ftAiSSw夜輪";
	const body = Buffer.alloc(64 * 1024, 9);
	const manifest = {
		v: 1,
		songs: [
			{
				id: `${id}.0`,
				song: "Oblivion:PHIN",
				composer: "Daily天利",
				jacket: true,
				charts: { SP: { label: "?", charter: "x", notes: 2026 } },
			},
		],
	};
	const server = createServer((req, res) => {
		if (req.url === "/4-1/index.json") {
			res.end(JSON.stringify(manifest));
			return;
		}
		if (req.url === `/4-1/phira/SP/${encodeURIComponent(id)}-SP.pez`) {
			res.setHeader("content-length", String(body.length));
			res.end(body);
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
	const { resetFoolsForTest } = await import("@/server/fools");
	resetFoolsForTest();
	try {
		const { GET } = await import("./route");
		const url = (level: string) =>
			new Request(
				`http://localhost/api/phira?id=${encodeURIComponent(`${id}.0`)}&level=${level}`,
			);
		const res = await GET(url("SP"));
		assert.equal(res.status, 200);
		assert.equal(res.headers.get("content-length"), String(body.length));
		assert.match(
			res.headers.get("content-disposition") ?? "",
			/^attachment; filename="OblivionPHIN\.Daily[^"]*vsEndCat[^"]*-SP\.pez"; filename\*=UTF-8''OblivionPHIN\.Daily%E5%A4%A9/,
		);
		assert.deepEqual(Buffer.from(await res.arrayBuffer()), body);
		// Only the levels the manifest lists
		assert.equal((await GET(url("IN"))).status, 404);
	} finally {
		process.env = env;
		resetFoolsForTest();
		server.closeAllConnections();
		server.close();
	}
});
