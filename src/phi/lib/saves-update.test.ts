import assert from "node:assert/strict";
import test from "node:test";
import type { Kv } from "@/server/sdk";
import { kvKey } from "./const";
import type { PhiRuntime } from "./runtime";
import { Save } from "./save";
import { updateSave } from "./saves";
import { TapApiError } from "./tapapi";

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const SAVE_URL = "https://example.test/save.zip";
const SAVE_ISO = "2024-01-01T00:00:00.000Z";

const saveInfo = {
	gameFile: { url: SAVE_URL },
	modifiedAt: { iso: SAVE_ISO },
	summary: { rankingScore: 14.5, challengeModeRank: 0, updatedAt: SAVE_ISO },
	PlayerId: "p",
};

function cachedSave() {
	return JSON.stringify({
		session: TOKEN,
		global: false,
		saveInfo,
		gameRecord: { song: [] },
	});
}

function mockRt(opts: {
	token?: string | null;
	log: string[];
	getSaveInfo: (global: boolean) => Promise<void>;
}) {
	class FakeUser {
		session: string;
		global: boolean;
		saveInfo = {
			gameFile: { url: SAVE_URL },
			modifiedAt: { iso: new Date(SAVE_ISO) },
			summary: { rankingScore: 14.5 },
			PlayerId: "p",
		};
		playerInfo = {};
		gameRecord = { song: [] };
		gameProgress = undefined;
		gameuser = undefined;
		gamesettings = undefined;
		Recordver = 1;
		constructor(session: string, global = false) {
			this.session = session;
			this.global = global;
			opts.log.push(`user:${global}`);
		}
		async getSaveInfo() {
			opts.log.push("taptap");
			await opts.getSaveInfo(this.global);
			return this.saveInfo;
		}
		async buildRecord() {
			opts.log.push("download");
		}
	}
	return {
		PhigrosUser: FakeUser,
		Save,
		store: {
			getSessionToken: async () =>
				opts.token === null ? "" : (opts.token ?? TOKEN),
			isSessionTokenBanned: async () => false,
			setSessionToken: async () => undefined,
		},
		getRksRank: {
			addUserRks: async () => undefined,
		},
	} as unknown as PhiRuntime;
}

function mockDb(opts: { log: string[]; save?: string }) {
	const saveKey = kvKey("save", TOKEN);
	return {
		get: async (key: string) => {
			opts.log.push(`kv:${key}`);
			return key === saveKey ? opts.save : undefined;
		},
		set: async () => undefined,
		del: async () => undefined,
		keys: async () => [],
		ping: async () => "PONG",
		close: async () => undefined,
	} satisfies Kv;
}

test("failed TapTap fetch does not read the Cloudflare save blob", async () => {
	const log: string[] = [];
	const rt = mockRt({
		log,
		getSaveInfo: async () => {
			throw new TapApiError("TapAPI timed out", true);
		},
	});
	const db = mockDb({ log, save: cachedSave() });
	await assert.rejects(
		() => updateSave(rt, db, "tap-timeout"),
		(err: unknown) => err instanceof TapApiError,
	);
	assert.deepEqual(log, ["user:false", "taptap"]);
});

test("TapTap save info is fetched before the Cloudflare save blob", async () => {
	const log: string[] = [];
	const rt = mockRt({
		log,
		getSaveInfo: async () => undefined,
	});
	const db = mockDb({ log, save: cachedSave() });
	await updateSave(rt, db, "tap-first");
	const taptap = log.indexOf("taptap");
	const kv = log.findIndex((step) => step.startsWith("kv:"));
	assert.ok(taptap >= 0);
	assert.ok(kv >= 0);
	assert.ok(taptap < kv);
	assert.equal(log.includes("download"), false);
});

test("unknown region retries the other TapTap host before Cloudflare", async () => {
	const log: string[] = [];
	const rt = mockRt({
		log,
		getSaveInfo: async (global) => {
			if (!global) throw new Error("Phigros cloud 401 Unauthorized");
		},
	});
	const db = mockDb({ log, save: cachedSave() });
	await updateSave(rt, db, "gb-retry");
	assert.deepEqual(log.slice(0, 4), [
		"user:false",
		"taptap",
		"user:true",
		"taptap",
	]);
	assert.ok(
		log.indexOf("taptap") < log.findIndex((step) => step.startsWith("kv:")),
	);
});

test("bind with an explicit region does not retry the other TapTap host", async () => {
	const log: string[] = [];
	const rt = mockRt({
		token: null,
		log,
		getSaveInfo: async () => {
			throw new Error("Phigros cloud 401 Unauthorized");
		},
	});
	const db = mockDb({ log });
	await assert.rejects(() =>
		updateSave(rt, db, "bind-cn", { token: TOKEN, global: false }),
	);
	assert.deepEqual(log, ["user:false", "taptap"]);
});
