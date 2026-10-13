import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { kvKey } from "@/phi/lib/const";
import type { Save } from "@/phi/lib/save";
import { resetShareMemForTest } from "@/server/share";

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const calls: string[] = [];
const kv = new Map<string, string>();
const db = { get: async (key: string) => kv.get(key) };
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
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
			return {
				saveInfo: { PlayerId: "Shared", summary: { rankingScore: 15.25 } },
			} as Save;
		},
	},
});

beforeEach(() => {
	kv.clear();
	calls.length = 0;
	resetShareMemForTest();
});

test("a shared page reads the token and save through the short memo, never fresh", async () => {
	kv.set(kvKey("webShare", "sharedslug01"), "pub1");
	const { loadShared } = await import("./load-shared");
	const shared = await loadShared("sharedslug01");
	assert.ok(shared);
	assert.equal(shared.player, "Shared");
	assert.equal(shared.rks, "15.2500");
	assert.deepEqual(calls, ["getBoundToken", "save:memo"]);
});

test("an unknown slug reads no binding", async () => {
	const { loadShared } = await import("./load-shared");
	assert.equal(await loadShared("missingslug1"), undefined);
	assert.deepEqual(calls, []);
});
