import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { jsonLoader } from "./manifest";

const KEY = "pv/index.json";

async function serve(handler: (url: string) => unknown | undefined) {
	let hits = 0;
	const server: Server = createServer((req, res) => {
		hits += 1;
		const body = handler(req.url ?? "");
		if (body === undefined) {
			res.statusCode = 404;
			res.end();
			return;
		}
		res.end(typeof body === "string" ? body : JSON.stringify(body));
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	return {
		base: `http://127.0.0.1:${port}`,
		hits: () => hits,
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
	try {
		return await run();
	} finally {
		process.env = env;
	}
}

const parse = (raw: unknown) => {
	const body = raw as { v?: number; n?: number } | null;
	return body?.v === 1 && typeof body.n === "number" ? body.n : undefined;
};

test("a file is read once per TTL and parsed", async () => {
	const server = await serve((url) =>
		url === `/${KEY}` ? { v: 1, n: 7 } : undefined,
	);
	try {
		await withBase(server.base, async () => {
			const loader = jsonLoader(KEY, parse, 0);
			assert.equal(await loader.load(), 7);
			assert.equal(await loader.load(), 7);
			assert.equal(server.hits(), 1);
		});
	} finally {
		server.close();
	}
});

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("a missing or unusable file is the empty value, and a later upload is picked up", async () => {
	let body: unknown;
	const server = await serve(() => body);
	const realNow = Date.now;
	let skew = 0;
	Date.now = () => realNow() + skew;
	try {
		await withBase(server.base, async () => {
			const loader = jsonLoader(KEY, parse, -1);
			assert.equal(await loader.load(), -1, "nothing published yet");
			body = "not json at all";
			skew += 61_000;
			assert.equal(await loader.load(), -1, "stale value, refresh started");
			await pause(60);
			body = { v: 2, n: 5 };
			skew += 61_000;
			assert.equal(
				await loader.load(),
				-1,
				"an unreadable body is no better than none",
			);
			await pause(60);
			body = { v: 1, n: 5 };
			skew += 61_000;
			assert.equal(await loader.load(), -1, "an unknown version is unusable");
			await pause(60);
			for (let i = 0; i < 100 && (await loader.load()) !== 5; i++) {
				skew += 61_000;
				await pause(10);
			}
			assert.equal(await loader.load(), 5);
		});
	} finally {
		Date.now = realNow;
		server.close();
	}
});

test("a failed read keeps the last good value", async () => {
	let body: unknown = { v: 1, n: 3 };
	const server = await serve(() => body);
	const realNow = Date.now;
	try {
		await withBase(server.base, async () => {
			const loader = jsonLoader(KEY, parse, 0);
			assert.equal(await loader.load(), 3);
			body = undefined;
			Date.now = () => realNow() + 6 * 60_000;
			assert.equal(await loader.load(), 3);
			await new Promise((resolve) => setTimeout(resolve, 100));
			Date.now = () => realNow() + 8 * 60_000;
			assert.equal(
				await loader.load(),
				3,
				"the outage does not blank the page",
			);
		});
	} finally {
		Date.now = realNow;
		server.close();
	}
});

test("without R2 the empty value stands in", async () => {
	const env = { ...process.env };
	delete process.env.CLOUDFLARE_R2_PUBLIC_BASE;
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	try {
		const loader = jsonLoader(KEY, parse, 42);
		assert.equal(await loader.load(), 42);
	} finally {
		process.env = env;
	}
});
