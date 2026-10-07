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
			new Request("http://localhost/api/phira?id=x&level=SP"),
		);
		assert.equal(bad.status, 400);
	} finally {
		process.env = env;
		server.closeAllConnections();
		server.close();
	}
});
