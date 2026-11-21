import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setSessionForTest } from "@/auth";
import { setRequestLocaleForTest } from "@/i18n/server";
import { resetManualMemForTest } from "@/server/manual";
import { markSongInfoReadyForTest } from "@/server/song-info";
import { GET } from "./route";

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const env = { ...process.env };
const tokens = new Map<string, string>();
const saves = new Map<string, unknown>();
const kv = new Map<string, string>();
const banned = new Set<string>();
const reads: string[] = [];

(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db: {
		get: async (key: string) => {
			reads.push(key);
			return kv.get(key);
		},
	},
	store: {},
	rt: {
		store: {
			isSessionTokenBanned: async (token: string) => banned.has(token),
		},
		Save: class {
			saveInfo = { summary: { rankingScore: 0 } };
			gameuser = {};
			getRecord() {
				return [];
			}
		},
	},
	lib: {
		getToken: async (_rt: unknown, userId: string) => tokens.get(userId),
		getBoundToken: async (_rt: unknown, userId: string) => {
			reads.push(`token:${userId}`);
			return tokens.get(userId);
		},
		loadSaveByToken: async (_rt: unknown, _db: unknown, token: string) =>
			saves.get(token),
	},
});

beforeEach(() => {
	markSongInfoReadyForTest();
	resetManualMemForTest();
	setRequestLocaleForTest("en");
	process.env.CLOUDFLARE_R2_BUCKET = "off";
	tokens.clear();
	saves.clear();
	kv.clear();
	banned.clear();
	reads.length = 0;
});

afterEach(() => {
	setSessionForTest();
	setRequestLocaleForTest();
	process.env = { ...env };
});

async function ask(userId: string | null) {
	setSessionForTest(userId);
	const res = await GET();
	return {
		status: res.status,
		cache: res.headers.get("cache-control"),
		body: (await res.json()) as Record<string, unknown>,
	};
}

const READ = {
	v: 1,
	collection: { alpa: [2, 2], shenqikuabao: [4, 3] },
	avatar: ["Glaciaxion"],
	single: ["Der Schneid"],
	illustration: ["Der Schneid"],
};

test("a signed-out request is refused before anything is read", async () => {
	const res = await ask(null);
	assert.equal(res.status, 401);
	assert.deepEqual(reads, []);
});

test("a player without a bound save, or a banned one, gets nothing to show", async () => {
	assert.deepEqual((await ask("u1")).body, { state: "none" });
	tokens.set("u1", TOKEN);
	assert.deepEqual((await ask("u1")).body, { state: "none" });
	saves.set(TOKEN, { unlocks: READ });
	banned.add(TOKEN);
	assert.deepEqual((await ask("u1")).body, { state: "none" });
});

test("a profile typed in by hand says so", async () => {
	kv.set(
		"phi:manualSave:u1",
		JSON.stringify({
			v: 1,
			playerId: "M",
			updatedAt: "2026-01-01T00:00:00.000Z",
			rks: 1,
			records: [],
		}),
	);
	const res = await ask("u1");
	assert.equal(res.status, 200);
	assert.deepEqual(res.body, { state: "manual" });
});

test("a save cached before unlock data was kept asks for one refresh", async () => {
	tokens.set("u1", TOKEN);
	saves.set(TOKEN, {});
	assert.deepEqual((await ask("u1")).body, { state: "refresh" });
	saves.set(TOKEN, { unlocks: { v: 9 } });
	assert.deepEqual((await ask("u1")).body, { state: "refresh" });
});

test("a save whose unlock data could not be read says so", async () => {
	tokens.set("u1", TOKEN);
	saves.set(TOKEN, { unlocks: { v: 1, error: "version" } });
	assert.deepEqual((await ask("u1")).body, { state: "unreadable" });
});

test("a read save comes back as the viewer's own counts, never cached", async () => {
	tokens.set("u1", TOKEN);
	tokens.set("u2", "zyxwvutsrqponmlkjihgfedcb");
	saves.set(TOKEN, { unlocks: READ });
	const res = await ask("u1");
	assert.equal(res.status, 200);
	assert.equal(res.cache, "private, no-store");
	assert.deepEqual(res.body, {
		state: "ok",
		collection: READ.collection,
		avatars: READ.avatar,
		chapters: {},
		total: { items: 0, unlocked: 0, full: 0, unread: 0 },
	});
	assert.deepEqual((await ask("u2")).body, { state: "none" });
});
