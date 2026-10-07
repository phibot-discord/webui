import assert from "node:assert/strict";
import test from "node:test";
import type { Save } from "@/phi/lib/save";
import { resolveCardEpoch, saveRevision } from "./bound";

function save(over: {
	url?: string;
	iso?: string | Date;
	updatedAt?: string;
}): Save {
	return {
		saveInfo: {
			gameFile: { url: over.url },
			modifiedAt: { iso: over.iso ?? "2024-01-01T00:00:00.000Z" },
			summary: {
				rankingScore: 0,
				challengeModeRank: 0,
				updatedAt: over.updatedAt ?? "2024-01-01T00:00:00.000Z",
			},
			PlayerId: "p",
		},
	} as Save;
}

test("saveRevision ignores signed query on the same game file", () => {
	assert.equal(
		saveRevision(save({ url: "https://cdn.example/save.zip?sign=aaa&t=1" })),
		saveRevision(save({ url: "https://cdn.example/save.zip?sign=bbb&t=2" })),
	);
});

test("saveRevision changes only when the file or modified time changes", () => {
	const a = saveRevision(save({ url: "https://cdn.example/save.zip" }));
	assert.notEqual(
		a,
		saveRevision(save({ url: "https://cdn.example/other.zip" })),
	);
	assert.notEqual(
		a,
		saveRevision(
			save({
				url: "https://cdn.example/save.zip",
				iso: "2024-02-01T00:00:00.000Z",
			}),
		),
	);
});

test("bypass epoch from the client wins over a stale KV read", () => {
	assert.equal(resolveCardEpoch("1710000000000", ""), "1710000000000");
	assert.equal(resolveCardEpoch("1710000000000", "1"), "1710000000000");
	assert.equal(resolveCardEpoch(undefined, "1"), "1");
	assert.equal(resolveCardEpoch("nope", "1"), "1");
});

test("refresh hands its token to updateSave and reads the epoch during the TapTap work", async () => {
	const { refreshSave } = await import("./bound");
	const TOKEN = "abcdefghijklmnopqrstuvwxy";
	const kv = new Map<string, string>([
		["phi:userToken:r1", TOKEN],
		["phi:webCardEpoch:r1", "1700000000000"],
	]);
	const log: string[] = [];
	let catalogStarted: () => void = () => undefined;
	const catalogRead = new Promise<void>((resolve) => {
		catalogStarted = resolve;
	});
	const store = {
		get: async (key: string) => {
			log.push(`get:${key}`);
			if (key === "phi:infoFile") catalogStarted();
			// The first token read finishes only once the catalog load is under way
			if (key === "phi:userToken:r1" && !log.includes("get:phi:infoFile")) {
				await Promise.race([
					catalogRead,
					new Promise((r) => setTimeout(r, 2_000)),
				]);
				assert.ok(
					log.includes("get:phi:infoFile"),
					"catalog load overlaps the KV checks",
				);
			}
			return kv.get(key);
		},
		set: async (key: string, value: string, opts?: { nx?: boolean }) => {
			if (opts?.nx && kv.has(key)) return null;
			kv.set(key, value);
			return "OK";
		},
		ttlMs: async () => 120_000,
		del: async (key: string) => {
			log.push(`del:${key}`);
			kv.delete(key);
			return 1;
		},
	};
	let fail = false;
	(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
		db: store,
		store,
		rt: { store: { isSessionTokenBanned: async () => false } },
		lib: {
			getToken: async (_rt: unknown, userId: string) =>
				store.get(`phi:userToken:${userId}`),
			updateSave: async (
				_rt: unknown,
				_db: unknown,
				_userId: string,
				opts: { bound?: string },
			) => {
				assert.equal(opts.bound, TOKEN, "no second token read");
				assert.ok(
					log.includes("get:phi:webCardEpoch:r1"),
					"epoch read already started",
				);
				if (fail) throw new Error("boom");
				return save({ iso: "2026-02-01T00:00:00.000Z" });
			},
		},
	});
	const out = await refreshSave("r1");
	assert.ok(!("error" in out));
	assert.equal(out.epoch, "1700000000000");
	assert.equal(out.lastSynced, "2026-02-01T00:00:00.000Z");
	assert.equal(log.filter((x) => x === "get:phi:userToken:r1").length, 1);

	kv.delete("phi:webRefresh:r1");
	fail = true;
	const failed = await refreshSave("r1");
	assert.ok("error" in failed && failed.error === "refresh_failed");
	assert.ok(log.includes("del:phi:webRefresh:r1"), "cooldown released");
});

test("loadBound reads KV by default and uses the token/save memo only when the card route asks", async () => {
	const { loadBound } = await import("./bound");
	const TOKEN = "abcdefghijklmnopqrstuvwxy";
	const calls: string[] = [];
	const host = {
		db: { get: async () => undefined },
		rt: { store: { isSessionTokenBanned: async () => false } },
		lib: {
			getToken: async () => {
				calls.push("getToken");
				return TOKEN;
			},
			getBoundToken: async () => {
				calls.push("getBoundToken");
				return TOKEN;
			},
			loadSaveByToken: async (
				_rt: unknown,
				_db: unknown,
				_token: string,
				opts?: { memo?: boolean },
			) => {
				calls.push(`save:${opts?.memo === true ? "memo" : "kv"}`);
				return save({ url: "https://cdn.example/save.zip" });
			},
		},
	} as unknown as Parameters<typeof loadBound>[0];
	// Pages and JSON routes: an unbind or refresh on another instance shows at once
	const page = await loadBound(host, "lb1");
	assert.ok(!("error" in page) && page.token === TOKEN);
	assert.deepEqual(calls, ["getToken", "save:kv"]);
	calls.length = 0;
	const card = await loadBound(host, "lb1", { memo: true });
	assert.ok(!("error" in card));
	assert.deepEqual(calls, ["getBoundToken", "save:memo"]);
});

test("loadBound passes the memo choice to the manual profile read", async () => {
	const { loadBound } = await import("./bound");
	const reads: string[] = [];
	const profile = JSON.stringify({
		v: 1,
		playerId: "M",
		updatedAt: "2026-01-01T00:00:00.000Z",
		rks: 1,
		records: [],
	});
	const host = {
		db: {
			get: async (key: string) => {
				reads.push(key);
				return key === "phi:manualSave:lb2" ? profile : undefined;
			},
		},
		rt: {
			store: { isSessionTokenBanned: async () => false },
			Save: class {
				saveInfo = { summary: { rankingScore: 0 } };
				gameuser = {};
				getRecord() {
					return [];
				}
			},
		},
		lib: {
			getToken: async () => undefined,
			getBoundToken: async () => undefined,
		},
	} as unknown as Parameters<typeof loadBound>[0];
	const { resetManualMemForTest } = await import("./manual");
	resetManualMemForTest();
	assert.ok(!("error" in (await loadBound(host, "lb2", { memo: true }))));
	assert.ok(!("error" in (await loadBound(host, "lb2", { memo: true }))));
	assert.equal(reads.length, 1, "the card route reuses the profile");
	const page = await loadBound(host, "lb2");
	assert.ok(!("error" in page) && page.manual === true);
	assert.equal(reads.length, 2, "a page reads KV");
	resetManualMemForTest();
});
