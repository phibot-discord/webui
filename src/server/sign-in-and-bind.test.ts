import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { kvKey } from "@/phi/lib/const";
import { initCredentials } from "@/phi/lib/credentials";
import { Save } from "@/phi/lib/save";
import { resetSaveBlobMemForTest } from "@/phi/lib/saves";
import type { TapLogin } from "@/phi/lib/taptap";
import { openTapTicket } from "./auth-tickets";
import {
	bindWithToken,
	finishQrBind,
	resetQrPollForTest,
	switchBind,
	unbindAccount,
} from "./bind";
import { playerFromSave } from "./bound";
import { getDataHost } from "./data-host";
import type { KvStore } from "./kv";
import { resetManualMemForTest } from "./manual";
import { tokenProof } from "./session-proof";
import { resetShareMemForTest } from "./share";
import { markSongInfoReadyForTest } from "./song-info";
import { finishTapLogin, peekTapLogin } from "./tap-login";

process.env.AUTH_SECRET ||= "x".repeat(32);

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const OLD = "zyxwvutsrqponmlkjihgfedcb";
const LOGIN = "a".repeat(32);
const DISCORD = "123456789012345678";
const QR = kvKey("webTapLogin", LOGIN);
const LOCK = kvKey("webTapLoginLock", LOGIN);
const RESUME = { result: { success: true }, useGlobal: false };
const PLAYER = {
	playerId: "Player",
	rks: 15.5,
	lastSynced: "2026-01-01T00:00:00.000Z",
};
const qrSession = JSON.stringify({ deviceId: "d", data: {}, global: false });

const kv = new Map<string, string>();
const log: string[] = [];
let tapLogin: TapLogin = {};
let logins = 0;
let tokenCalls = 0;
let tokenError: Error | undefined;
let gate: Promise<void> = Promise.resolve();

const kvFake = {
	get: async (key: string) => kv.get(key),
	set: async (
		key: string,
		value: unknown,
		opts?: number | { nx?: boolean; ttlMs?: number },
	) => {
		if (typeof opts === "object" && opts.nx && kv.has(key)) return null;
		log.push(`set ${key}`);
		kv.set(key, String(value));
		return "OK";
	},
	del: async (...keys: string[]) => {
		for (const key of keys) {
			log.push(`del ${key}`);
			kv.delete(key);
		}
		return keys.length;
	},
	keys: async () => [...kv.keys()],
	ttlMs: async () => -1,
	list: async () => [],
};

class FakeUser {
	saveInfo = {
		gameFile: { url: "https://example.test/save.zip" },
		modifiedAt: { iso: new Date("2026-01-01T00:00:00.000Z") },
		summary: { rankingScore: 15.5, challengeModeRank: 0 },
		PlayerId: "Player",
	};
	playerInfo = {};
	gameRecord = {};
	Recordver = 1;
	constructor(
		readonly session: string,
		readonly global = false,
	) {}
	async getSaveInfo() {
		return this.saveInfo;
	}
	async buildRecord() {}
}

(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db: kvFake,
	store: kvFake,
	rt: {
		PhigrosUser: FakeUser,
		Save,
		store: initCredentials(kvFake as unknown as KvStore),
		getQRcode: {
			login: async () => {
				logins += 1;
				await gate;
				return tapLogin;
			},
			getSessionToken: async () => {
				tokenCalls += 1;
				await gate;
				if (tokenError) throw tokenError;
				return TOKEN;
			},
		},
	},
	lib: {},
});

function holdTapTap() {
	let release: () => void = () => undefined;
	gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	return release;
}

async function until(done: () => boolean, what: string) {
	const end = Date.now() + 2000;
	while (!done()) {
		assert.ok(Date.now() < end, `timed out waiting for ${what}`);
		await new Promise<void>((resolve) => setTimeout(resolve, 5));
	}
}

function at(entry: string) {
	const i = log.indexOf(entry);
	assert.notEqual(i, -1, `${entry} missing from ${log.join(", ")}`);
	return i;
}

beforeEach(() => {
	kv.clear();
	log.length = 0;
	tapLogin = {
		sessionToken: TOKEN,
		objectId: "obj1",
		name: "N",
		avatar: "https://a.example/x.png",
	};
	logins = 0;
	tokenCalls = 0;
	tokenError = undefined;
	gate = Promise.resolve();
	markSongInfoReadyForTest();
	resetSaveBlobMemForTest();
	resetManualMemForTest();
	resetShareMemForTest();
	resetQrPollForTest();
});

test("an unlinked TapTap sign-in binds the tap user and returns a ticket without a proof", async () => {
	kv.set(QR, qrSession);
	const out = await finishTapLogin(LOGIN, RESUME);
	assert.ok("ticket" in out, JSON.stringify(out));
	const { ticket, ...player } = out;
	assert.deepEqual(player, PLAYER);
	assert.deepEqual(await openTapTicket(ticket, LOGIN), {
		id: "tap:obj1",
		name: "N",
		image: "https://a.example/x.png",
	});
	assert.equal(kv.get(kvKey("userToken", "tap:obj1")), TOKEN);
	assert.equal(kv.has(kvKey("save", TOKEN)), true);
	assert.equal(kv.has(QR), false);
	assert.equal(kv.has(LOCK), false);
	assert.equal(kv.has(kvKey("tokenUser", TOKEN)), false);
});

test("a sign-in that resolves to a Discord user carries the proof and records the reverse index", async () => {
	kv.set(QR, qrSession);
	kv.set(kvKey("webTapLink", "obj1"), DISCORD);
	const out = await finishTapLogin(LOGIN, RESUME);
	assert.ok("ticket" in out, JSON.stringify(out));
	assert.deepEqual(await openTapTicket(out.ticket, LOGIN), {
		id: DISCORD,
		name: "N",
		image: "https://a.example/x.png",
		proof: tokenProof(TOKEN),
	});
	assert.equal(kv.get(kvKey("userToken", DISCORD)), TOKEN);
	assert.equal(kv.has(kvKey("userToken", "tap:obj1")), false);
	assert.equal(kv.get(kvKey("tokenUser", TOKEN)), DISCORD);
	assert.ok(
		at(`set ${kvKey("userToken", DISCORD)}`) <
			at(`set ${kvKey("tokenUser", TOKEN)}`),
		log.join(", "),
	);
});

test("a sign-in into the Discord user that already holds the save records the reverse index too", async () => {
	kv.set(QR, qrSession);
	kv.set(kvKey("webTapLink", "obj1"), DISCORD);
	kv.set(kvKey("userToken", DISCORD), TOKEN);
	const out = await finishTapLogin(LOGIN, RESUME);
	assert.ok("ticket" in out, JSON.stringify(out));
	assert.equal(kv.get(kvKey("userToken", DISCORD)), TOKEN);
	assert.equal(kv.get(kvKey("tokenUser", TOKEN)), DISCORD);
});

test("of two racing sign-in polls one finishes and one is busy, and a later poll finds it gone", async () => {
	kv.set(QR, qrSession);
	const release = holdTapTap();
	const first = finishTapLogin(LOGIN, RESUME);
	await until(() => logins === 1, "the first login");
	assert.deepEqual(await finishTapLogin(LOGIN, RESUME), {
		error: "qr_busy",
		status: 409,
	});
	release();
	const out = await first;
	assert.ok("ticket" in out, JSON.stringify(out));
	assert.equal(logins, 1);
	assert.deepEqual(await peekTapLogin(LOGIN), {
		error: "qr_expired",
		status: 410,
	});
	assert.equal(kv.has(LOCK), false);
});

function assertBindOrder(userId: string) {
	const token = at(`set ${kvKey("userToken", userId)}`);
	for (const key of [
		kvKey("save", TOKEN),
		kvKey("hisb30", userId),
		kvKey("history", TOKEN),
	]) {
		assert.ok(
			at(`set ${key}`) < token,
			`set ${key} after the token: ${log.join(", ")}`,
		);
	}
	const qr = at(`del ${kvKey("webQr", userId)}`);
	const lock = at(`del ${kvKey("qrbind", userId)}`);
	assert.ok(token < qr, log.join(", "));
	assert.ok(token < lock, log.join(", "));
	const reverse = at(`set ${kvKey("tokenUser", TOKEN)}`);
	assert.ok(qr < reverse, log.join(", "));
	assert.ok(lock < reverse, log.join(", "));
	assert.equal(kv.get(kvKey("tokenUser", TOKEN)), userId);
	assert.equal(
		log.some((entry) => entry.includes(":webShare")),
		false,
		log.join(", "),
	);
}

test("binding a token writes the save, then the token, then clears the QR, then the reverse index", async () => {
	kv.set(kvKey("webQr", "u1"), qrSession);
	kv.set(kvKey("qrbind", "u1"), "1");
	const out = await bindWithToken("u1", TOKEN, "cn");
	assert.deepEqual(out, PLAYER, JSON.stringify(out));
	assertBindOrder("u1");
});

test("finishing a QR bind writes in the same order", async () => {
	kv.set(kvKey("webQr", "u2"), qrSession);
	kv.set(kvKey("qrbind", "u2"), "1");
	const out = await finishQrBind("u2", RESUME);
	assert.deepEqual(out, PLAYER, JSON.stringify(out));
	assert.equal(tokenCalls, 1);
	assertBindOrder("u2");
});

test("switching to a new token keeps the old binding until the new save is in", async () => {
	kv.set(kvKey("userToken", "u3"), OLD);
	kv.set(kvKey("save", OLD), "{}");
	const out = playerFromSave(
		await switchBind(await getDataHost(), "u3", TOKEN, false),
	);
	assert.deepEqual(out, PLAYER, JSON.stringify(out));
	const token = at(`set ${kvKey("userToken", "u3")}`);
	assert.ok(at(`set ${kvKey("save", TOKEN)}`) < token, log.join(", "));
	assert.equal(kv.get(kvKey("userToken", "u3")), TOKEN);
	await until(() => !kv.has(kvKey("save", OLD)), "the old save to go");
	assert.ok(at(`del ${kvKey("save", OLD)}`) > token, log.join(", "));
});

const MANUAL_ROW = { t: 1, rks: 3, phi: [], b27: [] };

function seedManual(userId: string) {
	kv.set(kvKey("manualSave", userId), JSON.stringify({ v: 1, records: [] }));
	kv.set(kvKey("hisb30", userId), JSON.stringify([MANUAL_ROW]));
}

function assertOnlyBindSnapshot(userId: string, since: number) {
	assert.equal(kv.has(kvKey("manualSave", userId)), false);
	const rows = JSON.parse(kv.get(kvKey("hisb30", userId)) ?? "[]") as {
		t: number;
		rks: number;
	}[];
	assert.equal(rows.length, 1, JSON.stringify(rows));
	assert.equal(rows[0]?.rks, 15.5);
	assert.ok((rows[0]?.t ?? 0) >= since, JSON.stringify(rows));
}

test("binding from manual mode drops the manual profile and its B30 rows and keeps the snapshot the bind wrote", async () => {
	seedManual("u4");
	const since = Date.now();
	const out = await bindWithToken("u4", TOKEN, "cn");
	assert.deepEqual(out, PLAYER, JSON.stringify(out));
	assertOnlyBindSnapshot("u4", since);
	assert.equal(kv.get(kvKey("userToken", "u4")), TOKEN);
});

test("a QR bind or a save switch from manual mode also keeps only the snapshot the bind wrote", async () => {
	seedManual("u10");
	seedManual("u11");
	kv.set(kvKey("webQr", "u10"), qrSession);
	kv.set(kvKey("qrbind", "u10"), "1");
	const since = Date.now();
	const qr = await finishQrBind("u10", RESUME);
	assert.deepEqual(qr, PLAYER, JSON.stringify(qr));
	assertOnlyBindSnapshot("u10", since);
	const switched = playerFromSave(
		await switchBind(await getDataHost(), "u11", TOKEN, false),
	);
	assert.deepEqual(switched, PLAYER, JSON.stringify(switched));
	assertOnlyBindSnapshot("u11", since);
});

test("a failed bind from manual mode keeps the manual profile and its B30 rows", async () => {
	seedManual("u12");
	kv.set(kvKey("banSessionToken", TOKEN), "1");
	assert.deepEqual(await bindWithToken("u12", TOKEN, "cn"), {
		error: "banned",
		status: 403,
	});
	assert.equal(kv.has(kvKey("manualSave", "u12")), true);
	assert.equal(kv.get(kvKey("hisb30", "u12")), JSON.stringify([MANUAL_ROW]));
	assert.equal(kv.has(kvKey("userToken", "u12")), false);
});

test("of two finishers of one QR bind one asks TapTap for the token and the other is busy", async () => {
	kv.set(kvKey("webQr", "u5"), qrSession);
	kv.set(kvKey("qrbind", "u5"), "1");
	const release = holdTapTap();
	const first = finishQrBind("u5", RESUME);
	await until(() => tokenCalls === 1, "the first finisher to reach TapTap");
	let second: unknown;
	const loser = finishQrBind("u5", RESUME).then((result) => {
		second = result;
	});
	try {
		await until(() => second !== undefined, "the second finisher to answer");
		assert.deepEqual(second, { error: "qr_busy", status: 409 });
		assert.equal(kv.has(kvKey("webQr", "u5")), true);
		assert.equal(kv.has(kvKey("qrbind", "u5")), true);
	} finally {
		release();
	}
	await loser;
	const out = await first;
	assert.deepEqual(out, PLAYER, JSON.stringify(out));
	assert.equal(tokenCalls, 1);
	assert.equal(kv.get(kvKey("userToken", "u5")), TOKEN);
	assert.equal(kv.has(kvKey("webQrLock", "u5")), false);
});

test("a failed QR finish clears the QR and releases its lock", async () => {
	kv.set(kvKey("webQr", "u8"), qrSession);
	kv.set(kvKey("qrbind", "u8"), "1");
	tokenError = new Error("token exchange failed");
	assert.deepEqual(await finishQrBind("u8", RESUME), {
		error: "bind_failed",
		status: 502,
		detail: "token exchange failed",
	});
	for (const kind of ["webQr", "qrbind", "webQrLock", "userToken"])
		assert.equal(kv.has(kvKey(kind, "u8")), false, kind);
	assert.ok(
		at(`set ${kvKey("webQrLock", "u8")}`) <
			at(`del ${kvKey("webQrLock", "u8")}`),
		log.join(", "),
	);
});

test("a QR bind after a finished one takes the lock again", async () => {
	kv.set(kvKey("webQr", "u9"), qrSession);
	kv.set(kvKey("qrbind", "u9"), "1");
	assert.deepEqual(await finishQrBind("u9", RESUME), PLAYER);
	assert.deepEqual(await unbindAccount("u9"), { ok: true });
	kv.set(kvKey("webQr", "u9"), qrSession);
	kv.set(kvKey("qrbind", "u9"), "1");
	const out = await finishQrBind("u9", RESUME);
	assert.deepEqual(out, PLAYER, JSON.stringify(out));
	assert.equal(tokenCalls, 2);
	const lock = kvKey("webQrLock", "u9");
	assert.equal(kv.has(lock), false);
	for (const entry of [`set ${lock}`, `del ${lock}`])
		assert.equal(
			log.filter((logged) => logged === entry).length,
			2,
			log.join(", "),
		);
});

test("unbind removes the binding, its save and the QR session, and keeps the share, the history and the reverse index", async () => {
	const gone = [
		kvKey("userToken", "u6"),
		kvKey("userApiId", "u6"),
		kvKey("save", TOKEN),
		kvKey("webQr", "u6"),
		kvKey("qrbind", "u6"),
		kvKey("webCompare", "sharedSlug12"),
	];
	const kept = new Map([
		[kvKey("tokenUser", TOKEN), "u6"],
		[kvKey("hisb30", "u6"), "[]"],
		[kvKey("history", TOKEN), "{}"],
		[kvKey("webShare", "sharedSlug12"), "u6"],
		[kvKey("webShareUser", "u6"), "sharedSlug12"],
	]);
	kv.set(kvKey("userToken", "u6"), TOKEN);
	kv.set(kvKey("userApiId", "u6"), "1");
	kv.set(kvKey("save", TOKEN), "{}");
	kv.set(kvKey("webQr", "u6"), qrSession);
	kv.set(kvKey("qrbind", "u6"), "1");
	kv.set(kvKey("webCompare", "sharedSlug12"), "1");
	for (const [key, value] of kept) kv.set(key, value);
	assert.deepEqual(await unbindAccount("u6"), { ok: true });
	await until(() => !kv.has(kvKey("save", TOKEN)), "the save to go");
	for (const key of gone) assert.equal(kv.has(key), false, key);
	for (const [key, value] of kept) assert.equal(kv.get(key), value, key);
});

test("unbinding a manual-only profile succeeds and removes it", async () => {
	kv.set(kvKey("manualSave", "u7"), JSON.stringify({ v: 1, records: [] }));
	kv.set(kvKey("hisb30", "u7"), "[]");
	assert.deepEqual(await unbindAccount("u7"), { ok: true });
	assert.equal(kv.has(kvKey("manualSave", "u7")), false);
	assert.equal(kv.has(kvKey("hisb30", "u7")), false);
});
