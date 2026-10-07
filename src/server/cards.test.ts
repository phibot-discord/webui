import assert from "node:assert/strict";
import test from "node:test";
import { renderCard } from "./cards";

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const JPEG = Buffer.from("fake-jpeg");

/**
 * A data host whose KV is a Map with a log of reads, and a bound user whose save
 * is a stub: enough for the lookup half of the card path (no render)
 */
function fakeHosts(
	opts: {
		cardDelayMs?: number;
		notes?: object;
		render?: (id: string) => Promise<unknown>;
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
			// Enough runtime for the history card's data (empty history, no catalog)
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
	// getHost() reads this global: counting reads tells whether the render host was asked for
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
		/** Store the card under whatever key the next lookup asks for */
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

test("a miss looks the card up first and reads the height only after", async () => {
	const h = fakeHosts();
	// No card stored, and the stub save cannot build card data: the render fails
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
	// One of the two waited on the other's paint: it reports only its own times
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
