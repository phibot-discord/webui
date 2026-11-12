import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
import { GET as publicCard } from "@/app/api/public/[slug]/card/[kind]/route";
import { cacheKey } from "./cache";
import { cardCacheKind } from "./card-kinds";
import { renderCard } from "./cards";
import { cardOgImage, cardOgResponse, titleCardImage } from "./og";
import { createShare } from "./share";

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const JPEG = Buffer.from("fake-jpeg");

function fakeHosts(
	opts: {
		cardDelayMs?: number;
		notes?: object;
		render?: (id: string, data?: unknown, opts?: unknown) => Promise<unknown>;
	} = {},
) {
	const kv = new Map<string, string>();
	const reads: string[] = [];
	const tokenReads: string[] = [];
	const get = async (key: string) => {
		reads.push(key);
		if (key.startsWith("phi:webCard:") && opts.cardDelayMs) {
			await new Promise((r) => setTimeout(r, opts.cardDelayMs));
		}
		return kv.get(key);
	};
	const store = {
		get,
		set: async (key: string, value: string) => {
			kv.set(key, value);
			return "OK";
		},
		del: async () => 1,
	};
	const save = {
		saveInfo: {
			gameFile: { url: "https://example.test/save.zip" },
			modifiedAt: { iso: "2026-01-01T00:00:00.000Z" },
			summary: {
				rankingScore: 15,
				challengeModeRank: 0,
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
			PlayerId: "p",
		},
	};
	const data = {
		db: store,
		store,
		rt: {
			store: { isSessionTokenBanned: async () => false },
			fCompute: {
				convertRichText: (s: unknown) => String(s ?? ""),
				formatDate: (v: unknown) => String(v),
				rks: () => 0,
			},
			getInfo: {
				resources: "/nonexistent-phi-res",
				raw: () => undefined,
				getill: () => "",
			},
		},
		lib: {
			getBoundToken: async () => {
				tokenReads.push("memo");
				return TOKEN;
			},
			getToken: async () => {
				tokenReads.push("kv");
				return TOKEN;
			},
			loadSaveByToken: async () => save,
		},
	};
	if (opts.notes) kv.set("phi:notes:u1", JSON.stringify(opts.notes));
	let hostReads = 0;
	const web = Promise.resolve({
		...data,
		catalog: { randomIll: () => "" },
		render: opts.render ?? (async () => {}),
	});
	const g = globalThis as Record<string, unknown>;
	g.__phiDataHost = Promise.resolve(data);
	// getHost() reads this global, so counting reads shows whether the render host was asked for
	Object.defineProperty(globalThis, "__phiWebHost", {
		configurable: true,
		get: () => {
			hostReads += 1;
			return web;
		},
		set: () => undefined,
	});
	return {
		kv,
		reads,
		tokenReads,
		hostReads: () => hostReads,
		cardReads: () => reads.filter((k) => k.startsWith("phi:webCard:")).length,
		heightReads: () =>
			reads.filter((k) => k.startsWith("phi:cardHeight:")).length,
		primeCard: () => {
			const orig = store.get;
			store.get = async (key: string) => {
				if (key.startsWith("phi:webCard:") && !kv.has(key)) {
					kv.set(key, JPEG.toString("base64"));
				}
				return orig(key);
			};
		},
	};
}

type CardOut = Awaited<ReturnType<typeof renderCard>>;
type CardOk = Exclude<CardOut, { error: unknown }>;

function ok(v: CardOut): CardOk {
	assert.ok(!("error" in v), `unexpected ${JSON.stringify(v)}`);
	return v;
}

test("identical concurrent card requests share one cache lookup and skip the height read on a hit", async () => {
	const h = fakeHosts({ cardDelayMs: 30 });
	h.primeCard();
	const [a, b] = await Promise.all([
		renderCard("u-dedupe", "b30", { locale: "en" }),
		renderCard("u-dedupe", "b30", { locale: "en" }),
	]);
	const x = ok(a);
	const y = ok(b);
	assert.equal(h.cardReads(), 1, "one durable lookup for both");
	assert.equal(h.heightReads(), 0, "height is only needed for a render");
	assert.equal(x.etag, y.etag);
	assert.equal(x.stats.cache, "hit");
	assert.equal(typeof x.stats.prepMs, "number");
	assert.ok(x.bytes.byteLength > 0);
});

test("If-None-Match on the current etag is answered as not modified, without the image", async () => {
	const h = fakeHosts();
	h.primeCard();
	const first = ok(await renderCard("u-304", "b30", { locale: "en" }));
	const before = h.cardReads();
	const again = ok(
		await renderCard("u-304", "b30", {
			locale: "en",
			ifNoneMatch: `"${first.etag}"`,
		}),
	);
	assert.equal(again.notModified, true);
	assert.equal(again.bytes.byteLength, 0);
	assert.equal(again.etag, first.etag);
	assert.equal(again.stats.revalidated, true);
	assert.equal(typeof again.stats.prepMs, "number");
	assert.equal(h.cardReads(), before, "no image lookup for a 304");
	const other = ok(
		await renderCard("u-304", "b30", {
			locale: "zh",
			ifNoneMatch: `"${first.etag}"`,
		}),
	);
	assert.notEqual(other.notModified, true, "another locale is another card");
	const download = ok(
		await renderCard("u-304", "b30", {
			locale: "en",
			ifNoneMatch: `"${first.etag}"`,
			download: true,
		}),
	);
	assert.notEqual(download.notModified, true, "downloads always get bytes");
});

test("a card already in memory does not boot the render host", async () => {
	const h = fakeHosts();
	h.primeCard();
	ok(await renderCard("u-mem", "b30", { locale: "en" }));
	await new Promise((r) => setImmediate(r));
	const booted = h.hostReads();
	const hit = ok(await renderCard("u-mem", "b30", { locale: "en" }));
	await new Promise((r) => setImmediate(r));
	assert.equal(hit.stats.cache, "hit");
	assert.equal(h.hostReads(), booted, "memory hit never asks for the host");
});

test("paint hooks fire for a fresh paint only, never for a card the cache answered", async () => {
	const h = fakeHosts();
	const painted: string[] = [];
	await renderCard("u-hooks", "b30", {
		locale: "en",
		onPaint: () => painted.push("paint"),
	});
	assert.deepEqual(painted, ["paint"]);
	h.primeCard();
	const hit = ok(
		await renderCard("u-hooks-hit", "b30", {
			locale: "en",
			onPaint: () => painted.push("hit"),
		}),
	);
	assert.equal(hit.stats.cache, "hit");
	assert.deepEqual(painted, ["paint"]);
});

test("a miss looks the card up first and reads the height only after", async () => {
	const h = fakeHosts();
	const out = await renderCard("u-miss", "b30", { locale: "en" });
	assert.ok("error" in out && out.error === "render_failed");
	const card = h.reads.findIndex((k) => k.startsWith("phi:webCard:"));
	const height = h.reads.findIndex((k) => k.startsWith("phi:cardHeight:"));
	assert.ok(card >= 0 && height > card, h.reads.join(" "));
});

test("the saved UI locale comes back for the cookie, while the request locale picks the card", async () => {
	const h = fakeHosts({ notes: { locale: "zh" } });
	h.primeCard();
	const out = ok(await renderCard("u1", "b30", { locale: "en" }));
	assert.equal(out.uiLocale, "zh");
	const fallback = ok(await renderCard("u1", "b30", { fallbackLocale: "en" }));
	assert.notEqual(
		fallback.etag,
		out.etag,
		"no explicit locale: notes (zh) wins",
	);
});

test("a classic fallback after the chosen layout fails is served transient and never cached", async () => {
	const painted: string[] = [];
	const h = fakeHosts({
		render: async (id) => {
			painted.push(id);
			if (id !== "phi/update/update") throw new Error("broken layout");
			return {
				bytes: JPEG,
				mime: "image/jpeg",
				ext: "jpg",
				width: 800,
				height: 900,
			};
		},
	});
	const opts = { locale: "en" as const, style: "timeline" };
	const first = ok(await renderCard("u-fallback", "hisb30", opts));
	assert.deepEqual(painted, [
		"phi/update/update-timeline",
		"phi/update/update",
	]);
	assert.equal(first.transient, true, "served no-store by both card routes");
	assert.match(first.etag, /-p$/, "never matches the real card's ETag");
	assert.equal(first.stats.cache, "miss");
	await new Promise((r) => setTimeout(r, 5));
	assert.equal(
		[...h.kv.keys()].some(
			(k) => k.startsWith("phi:webCard:") || k.startsWith("phi:cardHeight:"),
		),
		false,
		"neither the image nor its height is stored",
	);
	const again = ok(await renderCard("u-fallback", "hisb30", opts));
	assert.equal(again.stats.cache, "miss", "not served from memory either");
	assert.equal(painted.length, 4, "the chosen layout is tried again");
});

test("a fallback paint is given its own height key and a fresh timeout", async () => {
	const seen: unknown[] = [];
	fakeHosts({
		render: async (_id, _data, opts) => {
			seen.push(opts);
			if (seen.length === 1) throw new Error("broken layout");
			return {
				bytes: JPEG,
				mime: "image/jpeg",
				ext: "jpg",
				width: 800,
				height: 900,
			};
		},
	});
	ok(
		await renderCard("u-fallback-opts", "hisb30", {
			locale: "en",
			style: "timeline",
		}),
	);
	assert.equal(seen.length, 2);
	const second = seen[1] as {
		heightKey?: unknown;
		height?: unknown;
		signal?: unknown;
	};
	assert.equal(typeof second.heightKey, "string");
	assert.match(String(second.heightKey), /:classic$/);
	assert.equal(second.height, undefined);
	assert.ok(second.signal instanceof AbortSignal);
	assert.equal(second.signal.aborted, false);
});

test("a reload request reads the binding from KV instead of the memo", async () => {
	const h = fakeHosts();
	h.primeCard();
	ok(await renderCard("u-fresh", "b30", { locale: "en" }));
	ok(await renderCard("u-fresh", "b30", { locale: "en", fresh: true }));
	assert.deepEqual(h.tokenReads, ["memo", "kv"]);
});

function paintStub(opts: { delayMs?: number; fail?: () => boolean } = {}) {
	let calls = 0;
	return {
		calls: () => calls,
		render: async () => {
			calls += 1;
			await new Promise((r) => setTimeout(r, opts.delayMs ?? 0));
			if (opts.fail?.()) throw new Error("raster crashed");
			return {
				bytes: JPEG,
				mime: "image/jpeg",
				ext: "jpg",
				width: 800,
				height: 900,
				timings: { paintMs: 5000, rasterMs: 4000 },
			};
		},
	};
}

test("two identical requests on a miss paint once and share the bytes and ETag", async () => {
	const paint = paintStub({ delayMs: 40 });
	fakeHosts({ render: paint.render });
	const opts = { locale: "en" as const };
	const [a, b] = await Promise.all([
		renderCard("u-paint-once", "hisb30", opts),
		renderCard("u-paint-once", "hisb30", opts),
	]);
	const x = ok(a);
	const y = ok(b);
	assert.equal(paint.calls(), 1, "one render for both");
	assert.equal(x.etag, y.etag);
	assert.deepEqual(x.bytes, y.bytes);
	assert.equal(x.stats.cache, "miss");
	assert.equal(y.stats.cache, "miss");
	const joined = [x, y].find((r) => r.stats.shared);
	const owner = [x, y].find((r) => !r.stats.shared);
	assert.ok(joined && owner, "one owner, one joiner");
	assert.equal(owner.stats.paintMs, 5000);
	assert.equal(joined.stats.dataMs, undefined);
	assert.equal(joined.stats.paintMs, undefined);
	assert.equal(joined.stats.rasterMs, undefined);
	assert.ok(joined.stats.cacheMs <= joined.stats.totalMs);
	assert.equal(typeof joined.stats.prepMs, "number");
});

test("a failed paint is shared by its joiners, then forgotten so the next request paints again", async () => {
	let failing = true;
	const paint = paintStub({ delayMs: 30, fail: () => failing });
	fakeHosts({ render: paint.render });
	const opts = { locale: "en" as const };
	const [a, b] = await Promise.all([
		renderCard("u-paint-fail", "hisb30", opts),
		renderCard("u-paint-fail", "hisb30", opts),
	]);
	assert.ok("error" in a && a.error === "render_failed");
	assert.ok("error" in b && b.error === "render_failed");
	assert.equal(paint.calls(), 1, "the joiner did not paint again");
	failing = false;
	const again = ok(await renderCard("u-paint-fail", "hisb30", opts));
	assert.equal(paint.calls(), 2, "the failure was not kept");
	assert.equal(again.stats.cache, "miss");
	assert.notEqual(again.stats.shared, true);
});

test("a card lookup that throws (KV or R2 down) is treated as a miss and the card is painted", async () => {
	const paint = paintStub();
	fakeHosts({ render: paint.render });
	const data = (await (globalThis as Record<string, unknown>)
		.__phiDataHost) as { store: { get: (key: string) => Promise<unknown> } };
	const get = data.store.get;
	data.store.get = async (key: string) => {
		if (key.startsWith("phi:webCard:")) throw new Error("kv down");
		return get(key);
	};
	const [a, b] = await Promise.all([
		renderCard("u-kv-down", "hisb30", { locale: "en" }),
		renderCard("u-kv-down", "hisb30", { locale: "en" }),
	]);
	assert.equal(ok(a).stats.cache, "miss");
	assert.equal(ok(b).etag, ok(a).etag);
	assert.equal(paint.calls(), 1, "both waited on one paint");
});

const MISSING = ["/tmp/phi-web-ill/original_ill/ill/a.png"];

function paintsThen(missingFirst: number, bytes: Buffer = JPEG) {
	let calls = 0;
	return {
		calls: () => calls,
		render: async () => {
			calls += 1;
			return {
				bytes,
				mime: "image/jpeg",
				ext: "jpg",
				width: 800,
				height: 900,
				...(calls <= missingFirst ? { missingImages: MISSING } : {}),
			};
		},
	};
}

const stored = (h: { kv: Map<string, string> }, prefix: string) =>
	[...h.kv.keys()].filter((k) => k.startsWith(prefix));

function shiftClock(ms: number) {
	const real = Date.now;
	Date.now = () => real() + ms;
	return () => {
		Date.now = real;
	};
}

const realJpeg = () =>
	sharp({
		create: { width: 16, height: 16, channels: 3, background: "#204060" },
	})
		.jpeg()
		.toBuffer();

test("a complete render is cached in memory and in the store, and the next request is a hit", async (t) => {
	const paint = paintsThen(0);
	const h = fakeHosts({ render: paint.render });
	const first = ok(await renderCard("u-complete", "hisb30", { locale: "en" }));
	assert.equal(first.stats.cache, "miss");
	assert.equal(first.transient, undefined);
	assert.doesNotMatch(first.etag, /-p$/);
	await new Promise((r) => setTimeout(r, 5));
	const card = cacheKey(cardCacheKind("hisb30"), "u-complete", first.etag);
	assert.deepEqual(stored(h, "phi:webCard:"), [card]);
	assert.equal(h.kv.get(card), JPEG.toString("base64"));
	const heights = stored(h, "phi:cardHeight:");
	assert.equal(heights.length, 1);
	assert.equal(h.kv.get(heights[0] ?? ""), "900");
	t.diagnostic(
		`healthy-card ${JSON.stringify({ etag: first.etag, card, height: heights[0] })}`,
	);
	const again = ok(await renderCard("u-complete", "hisb30", { locale: "en" }));
	assert.equal(again.stats.cache, "hit");
	assert.equal(again.etag, first.etag);
	assert.equal(paint.calls(), 1);
});

test("the public card route answers a complete card with the shared cache header and its ETag", async (t) => {
	fakeHosts({ render: paintsThen(0).render });
	const slug = await createShare("u-route");
	const res = await publicCard(
		new Request(`https://example.test/api/public/${slug}/card/hisb30`, {
			headers: { "x-forwarded-for": "203.0.113.42" },
		}),
		{ params: Promise.resolve({ slug, kind: "hisb30" }) },
	);
	assert.equal(res.status, 200);
	const cacheControl = res.headers.get("cache-control");
	const etag = res.headers.get("etag");
	assert.equal(
		cacheControl,
		"public, s-maxage=300, stale-while-revalidate=86400",
	);
	assert.match(etag ?? "", /^"[0-9a-f]+"$/);
	t.diagnostic(`healthy-route ${JSON.stringify({ cacheControl, etag })}`);
});

test("a complete card's share preview is its crop, answered with the card preview cache header", async (t) => {
	fakeHosts({ render: paintsThen(0, await realJpeg()).render });
	const crop = await cardOgImage("u-og-complete", "hisb30", "en");
	assert.ok(Buffer.isBuffer(crop));
	const res = await cardOgResponse(Promise.resolve(crop), "/og/fallback.jpg");
	assert.equal(res.status, 200);
	const cacheControl = res.headers.get("cache-control");
	assert.equal(
		cacheControl,
		"public, max-age=300, s-maxage=900, stale-while-revalidate=86400",
	);
	const sha256 = createHash("sha256").update(crop).digest("hex");
	t.diagnostic(
		`healthy-preview ${JSON.stringify({ sha256, cacheControl, type: res.headers.get("content-type"), length: res.headers.get("content-length") })}`,
	);
});

test("a layout fallback's share preview is still its crop", async () => {
	const jpeg = await realJpeg();
	const h = fakeHosts({
		render: async (id) => {
			if (id !== "phi/update/update") throw new Error("broken layout");
			return {
				bytes: jpeg,
				mime: "image/jpeg",
				ext: "jpg",
				width: 800,
				height: 900,
			};
		},
	});
	h.kv.set(
		"phi:notes:u-og-fallback",
		JSON.stringify({ cardStyle: { hisb30: "timeline" } }),
	);
	const card = ok(
		await renderCard("u-og-fallback", "hisb30", { locale: "en" }),
	);
	assert.equal(card.transient, true);
	assert.ok(
		Buffer.isBuffer(await cardOgImage("u-og-fallback", "hisb30", "en")),
	);
});

test("a render with a missing image is not stored, is reused from memory for a minute, then painted again", async () => {
	const paint = paintsThen(1);
	const h = fakeHosts({ render: paint.render });
	const opts = { locale: "en" as const };
	const first = ok(await renderCard("u-missing-img", "hisb30", opts));
	assert.equal(first.transient, true);
	assert.match(first.etag, /-p$/);
	assert.ok(first.bytes.byteLength > 0);
	await new Promise((r) => setTimeout(r, 5));
	assert.equal(stored(h, "phi:webCard:").length, 0);
	assert.equal(stored(h, "phi:cardHeight:").length, 0);
	const held = ok(await renderCard("u-missing-img", "hisb30", opts));
	assert.equal(held.transient, true);
	assert.equal(held.etag, first.etag);
	assert.equal(held.stats.cache, "hit");
	assert.equal(paint.calls(), 1);
	const restore = shiftClock(61_000);
	try {
		const later = ok(await renderCard("u-missing-img", "hisb30", opts));
		assert.equal(later.stats.cache, "miss");
		assert.equal(later.transient, undefined);
		assert.equal(paint.calls(), 2);
		await new Promise((r) => setTimeout(r, 5));
		assert.equal(stored(h, "phi:webCard:").length, 1);
		const hit = ok(await renderCard("u-missing-img", "hisb30", opts));
		assert.equal(hit.stats.cache, "hit");
		assert.equal(paint.calls(), 2);
	} finally {
		restore();
	}
});

test("a held answer keeps the paint's result, its missing-data list included", async () => {
	fakeHosts({ render: paintsThen(1).render });
	const opts = { locale: "en" as const };
	const first = ok(await renderCard("u-held-result", "hisb30", opts));
	assert.equal(first.transient, true);
	const held = ok(await renderCard("u-held-result", "hisb30", opts));
	const rest = (s: typeof first.stats) => {
		const { cache, store, prepMs, cacheMs, totalMs, ...other } = s;
		return other;
	};
	assert.equal(held.stats.cache, "hit");
	assert.ok("missing" in held.stats);
	assert.deepEqual(rest(held.stats), rest(first.stats));
	assert.deepEqual(
		{ ...held, stats: undefined },
		{ ...first, stats: undefined },
	);
});

test("the same player in another locale inside the minute gets a paint of its own", async () => {
	const paint = paintsThen(2);
	fakeHosts({ render: paint.render });
	const en = ok(await renderCard("u-held-locale", "hisb30", { locale: "en" }));
	assert.equal(en.transient, true);
	const ja = ok(await renderCard("u-held-locale", "hisb30", { locale: "ja" }));
	assert.equal(paint.calls(), 2);
	assert.notEqual(ja.etag, en.etag);
});

test("a no-cache request skips and drops the held card", async () => {
	let calls = 0;
	fakeHosts({
		render: async () => {
			calls += 1;
			if (calls === 2) throw new Error("raster crashed");
			return {
				bytes: JPEG,
				mime: "image/jpeg",
				ext: "jpg",
				width: 800,
				height: 900,
				...(calls === 1 ? { missingImages: MISSING } : {}),
			};
		},
	});
	const opts = { locale: "en" as const };
	const first = ok(await renderCard("u-held-fresh", "hisb30", opts));
	assert.equal(first.transient, true);
	const retry = await renderCard("u-held-fresh", "hisb30", {
		...opts,
		fresh: true,
	});
	assert.ok("error" in retry && retry.error === "render_failed");
	assert.equal(calls, 2);
	const next = ok(await renderCard("u-held-fresh", "hisb30", opts));
	assert.equal(calls, 3);
	assert.equal(next.transient, undefined);
});

test("a card image over 4 MB with a missing image is not held", async () => {
	const paint = paintsThen(2, Buffer.alloc(4 * 1024 * 1024 + 1));
	fakeHosts({ render: paint.render });
	const opts = { locale: "en" as const };
	const first = ok(await renderCard("u-held-big", "hisb30", opts));
	assert.equal(first.transient, true);
	ok(await renderCard("u-held-big", "hisb30", opts));
	assert.equal(paint.calls(), 2);
});

test("a paint with a progress listener keeps a card with a missing image out of the store too", async () => {
	const paint = paintsThen(1);
	const h = fakeHosts({ render: paint.render });
	const painted: string[] = [];
	const opts = {
		locale: "en" as const,
		onPaint: () => painted.push("paint"),
	};
	const out = ok(await renderCard("u-missing-stream", "hisb30", opts));
	assert.deepEqual(painted, ["paint"]);
	assert.equal(out.transient, true);
	await new Promise((r) => setTimeout(r, 5));
	assert.equal(stored(h, "phi:webCard:").length, 0);
	const held = ok(await renderCard("u-missing-stream", "hisb30", opts));
	assert.equal(held.transient, true);
	assert.deepEqual(painted, ["paint"]);
});

test("a share preview of a card with a missing image is the failed-render answer, also from the hold", async () => {
	const paint = paintsThen(1, await realJpeg());
	fakeHosts({ render: paint.render });
	const failed = { error: "render_failed", status: 503 };
	assert.deepEqual(await cardOgImage("u-og", "hisb30", "en"), failed);
	assert.deepEqual(await cardOgImage("u-og", "hisb30", "en"), failed);
	assert.equal(paint.calls(), 1);
	const restore = shiftClock(61_000);
	try {
		assert.ok(Buffer.isBuffer(await cardOgImage("u-og", "hisb30", "en")));
	} finally {
		restore();
	}
});

test("a title card painted with a missing image is not kept, and the next request paints it again", async () => {
	const paint = paintsThen(1, await realJpeg());
	fakeHosts({ render: paint.render });
	await assert.rejects(titleCardImage("tags", "ja"));
	const img = await titleCardImage("tags", "ja");
	assert.ok(Buffer.isBuffer(img));
	assert.equal(paint.calls(), 2);
});
