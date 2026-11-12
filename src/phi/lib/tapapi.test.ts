import assert from "node:assert/strict";
import test from "node:test";
import { isTimeoutError } from "@/server/outgoing";
import {
	isRetryableTapNet,
	isTapApiFailure,
	isTapRateLimited,
	setTapHttpForTest,
	TAPAPI_TIMEOUT_MS,
	TapApiError,
	tapAgent,
	tapCnProxyUrl,
	tapFetch,
	tapProxyForwardHeaders,
	tapRemainMs,
	withTapWait,
} from "./tapapi";

test("TapTap cloud waits 30s including TCP connect", () => {
	assert.equal(TAPAPI_TIMEOUT_MS, 30_000);
	assert.equal(tapAgent.connectTimeout, 30_000);
	assert.equal(tapAgent.connect.timeout, 30_000);
});

test("undici connect timeout is a TapAPI timeout", () => {
	const cause = new Error("Connect Timeout Error");
	cause.name = "ConnectTimeoutError";
	(cause as { code?: string }).code = "UND_ERR_CONNECT_TIMEOUT";
	assert.equal(isTimeoutError(new TypeError("fetch failed", { cause })), true);
});

test("withTapWait notifies once on the first TapTap fetch", async () => {
	let fetches = 0;
	setTapHttpForTest(async () => {
		fetches += 1;
		return new Response("{}", { status: 200 });
	});
	try {
		let notes = 0;
		await withTapWait(
			() => {
				notes += 1;
			},
			async () => {
				await tapFetch("https://example.test/a");
				await tapFetch("https://example.test/b");
			},
		);
		assert.equal(fetches, 2);
		assert.equal(notes, 1);
	} finally {
		setTapHttpForTest();
	}
});

test("withTapWait stays quiet when TapTap is not contacted", async () => {
	let notes = 0;
	await withTapWait(
		() => {
			notes += 1;
		},
		async () => "local",
	);
	assert.equal(notes, 0);
});

test("tapFetch without withTapWait still works", async () => {
	setTapHttpForTest(async () => new Response("{}", { status: 200 }));
	try {
		const res = await tapFetch("https://example.test/plain");
		assert.equal(res.status, 200);
	} finally {
		setTapHttpForTest();
	}
});

test("AbortSignal.timeout rejects fractional leftover ms from performance.now", () => {
	const remain = tapRemainMs(0, TAPAPI_TIMEOUT_MS, 0.00488699999);
	assert.equal(remain, 29_999);
	assert.doesNotThrow(() => AbortSignal.timeout(remain));
});

test("isRetryableTapNet retries kernel SYN deaths, not HTTP errors", () => {
	const timed = new TypeError("fetch failed");
	(timed as { cause?: unknown }).cause = Object.assign(new Error("connect"), {
		code: "ETIMEDOUT",
	});
	assert.equal(isRetryableTapNet(timed), true);
	assert.equal(isRetryableTapNet(new TapApiError("TapAPI 502")), false);
});

test("CN TapTap is proxied; global TapTap is not", () => {
	assert.equal(
		tapCnProxyUrl("https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/users/me"),
		"https://sync.phibot.dev/tap-proxy",
	);
	assert.equal(
		tapCnProxyUrl("https://accounts.tapapis.cn/oauth2/v1/token"),
		"https://sync.phibot.dev/tap-proxy",
	);
	assert.equal(
		tapCnProxyUrl("https://rak3ffdi.tds1.tapfiles.cn/gamesaves/abc/.save"),
		"https://sync.phibot.dev/tap-proxy",
	);
	assert.equal(
		tapCnProxyUrl("https://upload.qiniup.com/buckets/b/objects/a2V5/uploads"),
		"https://sync.phibot.dev/tap-proxy",
	);
	assert.equal(
		tapCnProxyUrl("https://kviehlel.cloud.ap-sg.tapapis.com/1.1/users/me"),
		undefined,
	);
	assert.equal(
		tapCnProxyUrl("https://accounts.tapapis.com/oauth2/v1/token"),
		undefined,
	);
});

test("CN tap proxy copies MAC onto x-tap-authorization", () => {
	const mac = 'MAC id="kid", ts="1", nonce="n", mac="m"';
	const headers = tapProxyForwardHeaders(
		"https://open.tapapis.cn/account/profile/v1?client_id=rAK3FfdieFob2Nn8Am",
		{ headers: { Authorization: mac } },
	);
	assert.equal(headers.get("authorization"), mac);
	assert.equal(headers.get("x-tap-authorization"), mac);
	assert.equal(
		headers.get("x-tap-target"),
		"https://open.tapapis.cn/account/profile/v1?client_id=rAK3FfdieFob2Nn8Am",
	);
});

test("CN tap proxy carries the Worker key only when one is configured", () => {
	const url = "https://open.tapapis.cn/account/profile/v1";
	assert.equal(
		tapProxyForwardHeaders(url, {}, "shared-secret").get("x-phi-proxy-key"),
		"shared-secret",
	);
	assert.equal(
		tapProxyForwardHeaders(url, {}, "").has("x-phi-proxy-key"),
		false,
	);
});

test("users/me GET retries ETIMEDOUT inside the 30s budget", async () => {
	let n = 0;
	setTapHttpForTest(async () => {
		n += 1;
		if (n < 2) {
			const err = new TypeError("fetch failed");
			(err as { cause?: unknown }).cause = Object.assign(new Error("connect"), {
				code: "ETIMEDOUT",
			});
			throw err;
		}
		return new Response("{}", { status: 200 });
	});
	try {
		const res = await tapFetch(
			"https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/users/me",
		);
		assert.equal(res.status, 200);
		assert.equal(n, 2);
	} finally {
		setTapHttpForTest();
	}
});

test("OAuth POST is not retried on fetch failed", async () => {
	let n = 0;
	setTapHttpForTest(async () => {
		n += 1;
		throw new TypeError("fetch failed");
	});
	try {
		await assert.rejects(
			() =>
				tapFetch("https://accounts.tapapis.cn/oauth2/v1/token", {
					method: "POST",
				}),
			TapApiError,
		);
		assert.equal(n, 1);
	} finally {
		setTapHttpForTest();
	}
});

test("authorization_pending 400 is a wait, not a tap warning", async () => {
	const warns: string[] = [];
	const orig = console.warn;
	console.warn = (...a: unknown[]) => {
		warns.push(a.map(String).join(" "));
	};
	setTapHttpForTest(
		async () =>
			new Response(
				JSON.stringify({
					data: { error: "authorization_pending", msg: "pending" },
				}),
				{ status: 400 },
			),
	);
	try {
		const res = await tapFetch("https://accounts.tapapis.com/oauth2/v1/token", {
			method: "POST",
		});
		assert.equal(res.status, 400);
		const body = (await res.json()) as { data?: { error?: string } };
		assert.equal(body.data?.error, "authorization_pending");
		assert.equal(
			warns.some((w) => /tap POST/.test(w)),
			false,
		);
	} finally {
		console.warn = orig;
		setTapHttpForTest();
	}
});

async function withTapServer(
	handle: (
		n: number,
		req: import("node:http").IncomingMessage,
		res: import("node:http").ServerResponse,
	) => void,
	fn: (url: string, hits: () => number) => Promise<void>,
) {
	const { createServer } = await import("node:http");
	let n = 0;
	const server = createServer((req, res) => {
		n += 1;
		handle(n, req, res);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };
	try {
		await fn(`http://127.0.0.1:${port}/1.1/users/me`, () => n);
	} finally {
		server.closeAllConnections();
		server.close();
	}
}

test("a dropped socket is retried by tapFetch alone, not again by undici", async () => {
	await withTapServer(
		(_n, req) => req.socket.destroy(),
		async (url, hits) => {
			await assert.rejects(() => tapFetch(url), TapApiError);
			assert.equal(hits(), 4, "four tapFetch attempts, one request each");
		},
	);
});

test("a 5xx is retried by undici twice, then reported", async () => {
	await withTapServer(
		(_n, _req, res) => {
			res.writeHead(503, { "retry-after": "0" });
			res.end();
		},
		async (url, hits) => {
			await assert.rejects(
				() => tapFetch(url),
				(err: unknown) =>
					err instanceof TapApiError &&
					/TapAPI 503/.test(err.message) &&
					!isTapRateLimited(err),
			);
			assert.equal(hits(), 3);
		},
	);
});

test("a 429 that outlasts the retries is a TapAPI failure, not a plain response", async () => {
	await withTapServer(
		(_n, _req, res) => {
			res.writeHead(429, { "retry-after": "0" });
			res.end();
		},
		async (url, hits) => {
			await assert.rejects(
				() => tapFetch(url),
				(err: unknown) =>
					err instanceof TapApiError &&
					err.status === 429 &&
					isTapRateLimited(err),
			);
			assert.equal(hits(), 3);
		},
	);
});

test("an error thrown by another copy of the module is still recognized", async () => {
	const spec = "./tapapi.ts?copy=1";
	const copy = (await import(spec)) as typeof import("./tapapi");
	assert.notEqual(copy.TapApiError, TapApiError);
	const limited = new copy.TapApiError(
		"TapAPI 429 Too Many Requests",
		false,
		429,
	);
	assert.equal(limited instanceof TapApiError, false);
	assert.equal(isTapRateLimited(limited), true);
	assert.equal(isTapApiFailure(limited), true);
	assert.equal(
		isTapRateLimited(new Error("wrapped", { cause: limited })),
		true,
	);
	assert.equal(
		isTapRateLimited(new copy.TapApiError("TapAPI 503", false, 503)),
		false,
	);
	assert.equal(
		isRetryableTapNet(new copy.TapApiError("TapAPI timed out", true)),
		true,
	);
	assert.equal(isTapRateLimited(new Error("TapAPI 429")), false);
});

test("ordinary responses and POST bodies pass through the tap agent intact", async () => {
	const big = "x".repeat(512 * 1024);
	await withTapServer(
		(_n, req, res) => {
			const chunks: Buffer[] = [];
			req.on("data", (c: Buffer) => chunks.push(c));
			req.on("end", () => {
				const body = Buffer.concat(chunks).toString();
				if (req.method === "POST") {
					res.writeHead(400, { "content-type": "application/json" });
					res.end(
						JSON.stringify({ data: { error: "authorization_pending" }, body }),
					);
					return;
				}
				res.end(big);
			});
		},
		async (url, hits) => {
			const got = await tapFetch(url);
			assert.equal(got.status, 200);
			assert.equal((await got.text()).length, big.length);
			const pending = await tapFetch(url, {
				method: "POST",
				body: new URLSearchParams({ device_code: "d" }),
			});
			assert.equal(pending.status, 400);
			const parsed = (await pending.json()) as { body?: string };
			assert.equal(parsed.body, "device_code=d");
			assert.equal(hits(), 2);
		},
	);
});

test("a refused TapTap answer is logged with its status and numeric code, never its body", async () => {
	const warns: string[] = [];
	const orig = console.warn;
	console.warn = (...a: unknown[]) => {
		warns.push(a.map(String).join(" "));
	};
	const body = JSON.stringify({ code: 211, error: "body-marker-7f3a" });
	setTapHttpForTest(async () => new Response(body, { status: 404 }));
	try {
		const res = await tapFetch("https://example.test/1.1/users/me");
		assert.equal(res.status, 404);
		assert.equal(await res.text(), body);
		setTapHttpForTest(
			async () =>
				new Response("<html>page-marker-7f3a</html>", { status: 403 }),
		);
		const page = await tapFetch("https://example.test/1.1/classes/_GameSave");
		assert.equal(page.status, 403);
		const lines = warns.filter((w) => w.includes("tap GET example.test/1.1/"));
		assert.equal(lines.length, 2);
		assert.match(
			lines[0] ?? "",
			/tap GET example\.test\/1\.1\/users\/me 404 \d+ms code 211/,
		);
		assert.match(
			lines[1] ?? "",
			/tap GET example\.test\/1\.1\/classes\/_GameSave 403 \d+ms/,
		);
		assert.equal(lines[1]?.includes("code"), false);
		assert.equal(
			warns.some((w) => w.includes("marker-7f3a")),
			false,
		);
	} finally {
		console.warn = orig;
		setTapHttpForTest();
	}
});

test("a 304 answer is passed through as a 304, not turned into a TapTap failure", async () => {
	setTapHttpForTest(
		async () => new Response(null, { status: 304, headers: { etag: '"v1"' } }),
	);
	try {
		const res = await tapFetch("https://example.test/gamesaves/a/.save");
		assert.equal(res.status, 304);
		assert.equal(res.headers.get("etag"), '"v1"');
		assert.equal(await res.text(), "");
	} finally {
		setTapHttpForTest();
	}
});
