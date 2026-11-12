import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { afterEach, beforeEach } from "node:test";
import { setRequestLocaleForTest } from "@/i18n/server";
import { resetRateLimitForTest } from "@/server/rate-limit";

// No Cloudflare: the catalog check reads KV through this stub, and R2 is a local server
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	store: { get: async () => undefined },
});

beforeEach(() => {
	resetRateLimitForTest();
	setRequestLocaleForTest("en");
});

afterEach(() => setRequestLocaleForTest());

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
		const gone = (await missing.json()) as { error: string; code: string };
		assert.equal(gone.error, gone.code);
		const bad = await GET(
			new Request("http://localhost/api/phira?id=x&level=..%2FXX"),
		);
		assert.equal(bad.status, 400);
		assert.deepEqual(await bad.json(), {
			error: "bad_level",
			code: "bad_level",
		});
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

test("a quote or backslash in a 4/1 id cannot break the download name", async () => {
	const id = 'Quote"Back\\Slash.Test';
	const manifest = {
		v: 1,
		songs: [
			{
				id,
				song: "Quote",
				charts: { SP: { label: "?", charter: "x", notes: 1 } },
			},
		],
	};
	const server = createServer((req, res) => {
		const path = decodeURIComponent(req.url ?? "");
		if (path === "/4-1/index.json") {
			res.end(JSON.stringify(manifest));
			return;
		}
		if (path === `/4-1/phira/SP/${id}-SP.pez`) {
			res.end(Buffer.alloc(16, 1));
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
		const res = await GET(
			new Request(
				`http://localhost/api/phira?id=${encodeURIComponent(id)}&level=SP`,
			),
		);
		assert.equal(res.status, 200);
		assert.equal(
			res.headers.get("content-disposition"),
			`attachment; filename="QuoteBackSlash.Test-SP.pez"; filename*=UTF-8''Quote%22Back%5CSlash.Test-SP.pez`,
		);
		await res.arrayBuffer();
	} finally {
		process.env = env;
		resetFoolsForTest();
		server.closeAllConnections();
		server.close();
	}
});

test("extra packs come from their own level folder, and are listed only when the bucket holds them", async () => {
	const files: Record<string, Buffer> = {
		"/phira/SP/Message.くるぶっこちゃん-SP.pez": Buffer.alloc(32, 3),
		"/phira/EZ_Error/望影の方舟Six.SeURa-EZ_Error.pez": Buffer.alloc(48, 4),
		"/phira/IN_Error/望影の方舟Six.SeURa-IN_Error.pez": Buffer.alloc(40, 5),
	};
	const server = createServer((req, res) => {
		const body = files[decodeURIComponent(req.url ?? "")];
		if (!body) {
			res.statusCode = 404;
			res.end();
			return;
		}
		res.setHeader("content-length", String(body.length));
		res.end(body);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = `http://127.0.0.1:${port}`;
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	const { resetFoolsForTest } = await import("@/server/fools");
	const { resetHiddenSongForTest } = await import("@/server/c9s6");
	const { ensureSongInfo } = await import("@/server/song-info");
	const { getInfo } = await import("@/phi/lib/get-info");
	const message = "Message.くるぶっこちゃん.0";
	resetFoolsForTest();
	resetHiddenSongForTest();
	try {
		await ensureSongInfo();
		getInfo.ori_info[message] = { id: message, song: "Message", chart: {} };
		const { GET } = await import("./route");
		const pack = (id: string, level: string) =>
			GET(
				new Request(
					`http://localhost/api/phira?id=${encodeURIComponent(id)}&level=${level}`,
				),
			);
		const sp = await pack("Message.くるぶっこちゃん.0", "SP");
		assert.equal(sp.status, 200);
		assert.match(
			sp.headers.get("content-disposition") ?? "",
			/filename\*=UTF-8''Message\.%E3%81%8F.*-SP\.pez$/,
		);
		assert.deepEqual(
			Buffer.from(await sp.arrayBuffer()),
			files["/phira/SP/Message.くるぶっこちゃん-SP.pez"],
		);
		const error = await pack("望影の方舟Six.SeURa.0", "EZ_Error");
		assert.equal(error.status, 200);
		assert.match(
			error.headers.get("content-disposition") ?? "",
			/-EZ_Error\.pez"; filename\*=/,
		);
		await error.arrayBuffer();
		assert.equal((await pack("望影の方舟Six.SeURa.0", "HD_Error")).status, 404);
		assert.equal((await pack("Unknown.Song.0", "EZ_Error")).status, 404);
		assert.equal((await pack("望影の方舟Six.SeURa.0", "AT_Error")).status, 404);
		assert.equal(
			(await pack("望影の方舟Six.SeURa.0", "AT%20Error")).status,
			400,
		);

		const { GET: extras } = await import("./extras/route");
		const res = await extras(
			new Request("http://localhost/api/phira/extras?id=nope"),
		);
		assert.equal(res.headers.get("cache-control"), "private, no-store");
		assert.deepEqual(await res.json(), { levels: [] });
		const { phiraExtras } = await import("@/server/phira");
		const bucket = async () =>
			[
				...Object.keys(files),
				"/phira/Legacy/望影の方舟Six.SeURa-Legacy.pez",
				"/phira/IN/望影の方舟Six.SeURa-IN.pez",
				"/phira/SP/Other.Song-SP.pez",
				"/chart/望影の方舟Six.SeURa.0/EZ_Error.json",
			].map((key) => ({ key: key.slice(1) }));
		assert.deepEqual(await phiraExtras("望影の方舟Six.SeURa.0", bucket), [
			"EZ_Error",
			"IN_Error",
			"Legacy",
		]);
		assert.deepEqual(await phiraExtras("Message.くるぶっこちゃん", bucket), [
			"SP",
		]);
		assert.deepEqual(await phiraExtras("Glaciaxion.SunsetRay.0", bucket), []);
		assert.deepEqual(await phiraExtras("nope", bucket), []);
		assert.deepEqual(
			await phiraExtras("Message.くるぶっこちゃん", async () => {
				throw new Error("r2 list 500");
			}),
			[],
		);
	} finally {
		delete getInfo.ori_info[message];
		process.env = env;
		resetFoolsForTest();
		resetHiddenSongForTest();
		server.closeAllConnections();
		server.close();
	}
});

test("an address gets 60 pack requests a minute, other addresses are not affected", async () => {
	const { GET } = await import("./route");
	const from = (ip: string) =>
		GET(
			new Request("http://localhost/api/phira?id=x&level=..%2FXX", {
				headers: { "x-forwarded-for": ip },
			}),
		);
	for (let i = 0; i < 60; i++) {
		assert.equal((await from("203.0.113.20")).status, 400, `request ${i + 1}`);
	}
	const refused = await from("203.0.113.20");
	assert.equal(refused.status, 429);
	const body = (await refused.json()) as { code: string };
	assert.equal(body.code, "rate_limit");
	assert.ok(refused.headers.get("retry-after"));
	assert.equal((await from("203.0.113.21")).status, 400);
});
