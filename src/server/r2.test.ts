import assert from "node:assert/strict";
import test from "node:test";
import { setAssetVersionsForTest } from "./assets";
import { publicObjectUrl, r2BucketName, readsViaEdge } from "./r2";

test("R2 bucket falls back when vercel env pull leaves a placeholder", () => {
	assert.equal(r2BucketName("phi-web-assets"), "phi-web-assets");
	assert.equal(r2BucketName(""), "phi-web-assets");
	assert.equal(r2BucketName("  "), "phi-web-assets");
	assert.equal(r2BucketName("[SENSITIVE]"), "phi-web-assets");
	assert.equal(r2BucketName(undefined), "phi-web-assets");
});

test("CLOUDFLARE_R2_BUCKET=off turns R2 off instead of using the default bucket", () => {
	assert.equal(r2BucketName("off"), "");
	assert.equal(r2BucketName(""), "phi-web-assets");
});

test("streamR2Object pipes the public object and remembers a 404", async () => {
	const { createServer } = await import("node:http");
	const { streamR2Object } = await import("./r2");
	let hits = 0;
	const server = createServer((req, res) => {
		hits += 1;
		if (req.url === "/phira/AT/a-AT.pez") {
			res.setHeader("content-length", "5");
			res.end("hello");
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
		const got = await streamR2Object("phira/AT/a-AT.pez");
		assert.ok(got);
		assert.equal(got.length, 5);
		assert.equal(await new Response(got.body).text(), "hello");
		assert.equal(await streamR2Object("phira/AT/none.pez"), undefined);
		assert.equal(await streamR2Object("phira/AT/none.pez"), undefined);
		assert.equal(
			hits,
			2,
			"the second miss is answered from the negative cache",
		);
	} finally {
		process.env = env;
		server.closeAllConnections();
		server.close();
	}
});

test("a failed read is remembered, a missing object is not", async () => {
	const { createServer } = await import("node:http");
	const { fetchR2Object, r2ErrorSince, resetR2ErrorForTest } = await import(
		"./r2"
	);
	const server = createServer((req, res) => {
		if (req.url?.startsWith("/err/")) {
			res.statusCode = 500;
			res.setHeader("retry-after", "0");
			res.end();
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
	resetR2ErrorForTest();
	try {
		const t0 = performance.now();
		assert.equal(await fetchR2Object("ill/missing.png"), undefined);
		assert.equal(r2ErrorSince(t0), false, "a 404 is not an error");
		assert.equal(await fetchR2Object("err/broken.png"), undefined);
		assert.equal(r2ErrorSince(t0), true);
		assert.equal(r2ErrorSince(performance.now() + 1), false);
	} finally {
		resetR2ErrorForTest();
		process.env = env;
		server.closeAllConnections();
		server.close();
	}
});

test("streamR2Object asks for unencoded bytes and drops the length of an encoded body", async () => {
	const { createServer } = await import("node:http");
	const { gzipSync } = await import("node:zlib");
	const { streamR2Object } = await import("./r2");
	const asked: Array<string | undefined> = [];
	const packed = gzipSync(Buffer.from("hello hello hello"));
	const server = createServer((req, res) => {
		asked.push(req.headers["accept-encoding"]);
		if (req.url === "/phira/AT/plain-AT.pez") {
			res.setHeader("content-length", "5");
			res.end("hello");
			return;
		}
		res.setHeader("content-encoding", "gzip");
		res.setHeader("content-length", String(packed.byteLength));
		res.end(packed);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = `http://127.0.0.1:${port}`;
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	try {
		const plain = await streamR2Object("phira/AT/plain-AT.pez");
		assert.equal(plain?.length, 5);
		await plain?.body.cancel();
		const encoded = await streamR2Object("phira/AT/gz-AT.pez");
		assert.ok(encoded);
		assert.equal(encoded.length, undefined, "no Content-Length to forward");
		assert.equal(await new Response(encoded.body).text(), "hello hello hello");
		assert.deepEqual(asked, ["identity", "identity"]);
	} finally {
		process.env = env;
		server.closeAllConnections();
		server.close();
	}
});

test("public links carry the file's version, so the edge can keep each one for long", () => {
	const env = { ...process.env };
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = "https://r2.example.test";
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	setAssetVersionsForTest(new Map([["music/Song A.ogg", "0123abcd"]]));
	try {
		assert.equal(
			publicObjectUrl("/music/Song A.ogg"),
			"https://r2.example.test/music/Song%20A.ogg?v=0123abcd",
		);
		assert.equal(
			publicObjectUrl("music/b.ogg"),
			"https://r2.example.test/music/b.ogg",
		);
	} finally {
		setAssetVersionsForTest(new Map());
		process.env = env;
	}
});

test("data that changes in place is read through the API even when versioned", () => {
	setAssetVersionsForTest(
		new Map([
			["info/info.csv", "0123abcd"],
			["pv/index.json", "0123abcd"],
			["info/oldInfo/a.csv", "0123abcd"],
		]),
	);
	try {
		assert.equal(readsViaEdge("info/info.csv", true), false);
		assert.equal(readsViaEdge("pv/index.json", true), false);
		assert.equal(readsViaEdge("info/oldInfo/a.csv", true), true);
	} finally {
		setAssetVersionsForTest(new Map());
	}
});

test("with a key pair set, reads, writes, deletes and listings go to the S3 endpoint, signed", async () => {
	const { createServer } = await import("node:http");
	const {
		deleteR2Object,
		fetchR2Object,
		putR2Object,
		r2Config,
		readPrivateR2Object,
	} = await import("./r2");
	const { listAssetPrefix } = await import("./assets");
	const { sha256Hex, signV4 } = await import("./sigv4");
	const firstPage =
		"<ListBucketResult><Contents><Key>cards/a.jpg</Key><ETag>&quot;0123456789abcdef0123456789abcdef&quot;</ETag><Size>4</Size></Contents><IsTruncated>true</IsTruncated><NextContinuationToken>t1</NextContinuationToken></ListBucketResult>";
	const lastPage =
		"<ListBucketResult><Contents><Key>cards/b.jpg</Key><ETag>&quot;fedcba9876543210fedcba9876543210&quot;</ETag><Size>5</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>";
	const seen: Array<{
		method: string;
		url: string;
		headers: Record<string, string | string[] | undefined>;
		body: Buffer;
	}> = [];
	const server = createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => {
			const method = req.method ?? "";
			const url = req.url ?? "";
			seen.push({
				method,
				url,
				headers: req.headers,
				body: Buffer.concat(chunks),
			});
			const route = `${method} ${url}`;
			if (route === "GET /test-bucket/info/a%20b%28c%29.json") {
				res.end("hello");
				return;
			}
			if (route === "GET /test-bucket/info/none.json") {
				res.statusCode = 404;
				res.end();
				return;
			}
			if (route === "PUT /test-bucket/cards/x.jpg") {
				res.end();
				return;
			}
			if (route === "DELETE /test-bucket/cards/x.jpg") {
				res.statusCode = 204;
				res.end();
				return;
			}
			if (method === "GET" && url.startsWith("/test-bucket?")) {
				const token = new URLSearchParams(url.slice(url.indexOf("?") + 1)).get(
					"continuation-token",
				);
				if (token === null || token === "t1") {
					res.setHeader("content-type", "application/xml");
					res.end(token === null ? firstPage : lastPage);
					return;
				}
			}
			res.statusCode = 400;
			res.end();
		});
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	const env = { ...process.env };
	delete process.env.CLOUDFLARE_API_TOKEN;
	delete process.env.CLOUDFLARE_R2_PUBLIC_BASE;
	process.env.CLOUDFLARE_R2_S3_ENDPOINT = `http://127.0.0.1:${port}`;
	process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-key-id";
	process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
	process.env.CLOUDFLARE_R2_BUCKET = "test-bucket";
	setAssetVersionsForTest(new Map());
	try {
		const got = await fetchR2Object("info/a b(c).json", {
			fresh: true,
			cache: "no-store",
		});
		assert.equal(got?.toString(), "hello");
		assert.equal(
			await readPrivateR2Object("info/none.json", r2Config()),
			undefined,
		);
		await putR2Object("cards/x.jpg", Buffer.from("jpeg"), "image/jpeg", {
			cache: "no-store",
		});
		await deleteR2Object("cards/x.jpg");
		assert.deepEqual(await listAssetPrefix("cards/", r2Config()), [
			{ key: "cards/a.jpg", size: 4, v: "0123456789ab" },
			{ key: "cards/b.jpg", size: 5, v: "fedcba987654" },
		]);
		assert.deepEqual(
			seen.map((r) => `${r.method} ${r.url}`),
			[
				"GET /test-bucket/info/a%20b%28c%29.json",
				"GET /test-bucket/info/none.json",
				"PUT /test-bucket/cards/x.jpg",
				"DELETE /test-bucket/cards/x.jpg",
				"GET /test-bucket?list-type=2&max-keys=1000&prefix=cards%2F",
				"GET /test-bucket?continuation-token=t1&list-type=2&max-keys=1000&prefix=cards%2F",
			],
		);
		for (const r of seen) {
			const header = (name: string) => {
				const value = r.headers[name];
				return typeof value === "string" ? value : "";
			};
			const q = r.url.indexOf("?");
			assert.equal(
				signV4({
					method: r.method,
					path: q < 0 ? r.url : r.url.slice(0, q),
					query: q < 0 ? "" : r.url.slice(q + 1),
					headers: {
						host: header("host"),
						"x-amz-content-sha256": header("x-amz-content-sha256"),
						"x-amz-date": header("x-amz-date"),
					},
					payloadHash: header("x-amz-content-sha256"),
					region: "auto",
					service: "s3",
					accessKeyId: "test-key-id",
					secretAccessKey: "test-secret",
					amzDate: header("x-amz-date"),
				}),
				header("authorization"),
				`${r.method} ${r.url}`,
			);
			if (r.method === "PUT") {
				assert.equal(header("x-amz-content-sha256"), sha256Hex(r.body));
			}
			assert.ok(!r.url.includes("test-secret"), r.url);
			for (const value of Object.values(r.headers)) {
				assert.ok(!String(value).includes("test-secret"), String(value));
			}
		}
	} finally {
		process.env = env;
		setAssetVersionsForTest(new Map());
		server.closeAllConnections();
		server.close();
	}
});

test("the server reads the edge copy only under a versioned link", () => {
	setAssetVersionsForTest(new Map([["music/a.ogg", "0123abcd"]]));
	try {
		assert.equal(readsViaEdge("music/a.ogg", true), true);
		assert.equal(readsViaEdge("music/new.ogg", true), false);
		assert.equal(
			readsViaEdge("music/new.ogg", false),
			true,
			"without API access the public domain is all there is",
		);
	} finally {
		setAssetVersionsForTest(new Map());
	}
});
