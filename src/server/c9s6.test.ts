import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { loadHiddenSong, objectSizes, resetHiddenSongForTest } from "./c9s6";

const FILES: Record<string, string> = {
	"/c9s6/index.json": JSON.stringify({
		v: 1,
		name: "C9S6",
		level: "SP",
		difficulty: "?",
		music: { file: "c9s6/music.ogg" },
		pack: { file: "c9s6/C9S6-SP.pez" },
	}),
	"/c9s6/music.ogg": "x".repeat(1234),
	"/c9s6/C9S6-SP.pez": "y".repeat(77),
};

async function serve(files: Record<string, string>) {
	const heads: string[] = [];
	const server: Server = createServer((req, res) => {
		const url = req.url ?? "";
		if (req.method === "HEAD") heads.push(url);
		const body = files[url];
		if (body === undefined) {
			res.statusCode = 404;
			res.end();
			return;
		}
		res.setHeader("content-length", Buffer.byteLength(body));
		res.end(req.method === "HEAD" ? undefined : body);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	return {
		base: `http://127.0.0.1:${port}`,
		heads,
		close() {
			server.closeAllConnections();
			server.close();
		},
	};
}

async function withBase<T>(base: string, run: () => Promise<T>): Promise<T> {
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = base;
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	resetHiddenSongForTest();
	try {
		return await run();
	} finally {
		process.env = env;
		resetHiddenSongForTest();
	}
}

test("the hidden song manifest loads, and a missing one is null", async () => {
	const server = await serve(FILES);
	try {
		await withBase(server.base, async () => {
			const song = await loadHiddenSong();
			assert.equal(song?.music, "c9s6/music.ogg");
			assert.equal(song?.pack, "c9s6/C9S6-SP.pez");
		});
	} finally {
		server.close();
	}
	const empty = await serve({});
	try {
		await withBase(empty.base, async () => {
			assert.equal(await loadHiddenSong(), null);
		});
	} finally {
		empty.close();
	}
});

test("download sizes come from HEAD, are cached, and a missing file has none", async () => {
	const server = await serve(FILES);
	try {
		await withBase(server.base, async () => {
			const keys = ["c9s6/music.ogg", "c9s6/C9S6-SP.pez", "c9s6/chart.json"];
			const sizes = await objectSizes(keys);
			assert.deepEqual(
				[...sizes],
				[
					["c9s6/music.ogg", 1234],
					["c9s6/C9S6-SP.pez", 77],
				],
			);
			assert.equal(server.heads.length, 3);
			await objectSizes(keys.slice(0, 2));
			assert.equal(server.heads.length, 3, "known sizes are not asked again");
		});
	} finally {
		server.close();
	}
});

test("a slow size check does not hold the page", async () => {
	const server: Server = createServer(() => undefined);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	try {
		await withBase(`http://127.0.0.1:${port}`, async () => {
			const at = Date.now();
			const sizes = await objectSizes(["c9s6/music.ogg"], 50);
			assert.equal(sizes.size, 0);
			assert.ok(Date.now() - at < 2000);
		});
	} finally {
		server.closeAllConnections();
		server.close();
	}
});
