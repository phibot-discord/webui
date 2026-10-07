import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { kvKey } from "@/phi/lib/const";
import { resetSaveBlobMemForTest } from "@/phi/lib/saves";
import { peekQrBind, resetQrPollForTest, unbindAccount } from "./bind";

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const kv = new Map<string, string>();
const log: string[] = [];
let qrResult: unknown = {
	success: false,
	data: { error: "authorization_pending" },
};

const db = {
	get: async (key: string) => {
		log.push(`get:${key}`);
		return kv.get(key);
	},
	set: async (key: string, value: string) => {
		kv.set(key, value);
	},
	del: async (...keys: string[]) => {
		for (const k of keys) {
			log.push(`del:${k}`);
			kv.delete(k);
		}
		return keys.length;
	},
	keys: async (pattern: string) => {
		log.push(`list:${pattern}`);
		return [...kv.keys()];
	},
};
const save = {
	saveInfo: {
		PlayerId: "Player",
		summary: { rankingScore: 15.5 },
		modifiedAt: { iso: "2026-01-01T00:00:00.000Z" },
	},
};
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
	rt: {
		store: {
			getSessionToken: (userId: string) => db.get(kvKey("userToken", userId)),
			clearLocalCredentials: (userId: string) =>
				db.del(kvKey("userToken", userId), kvKey("userApiId", userId)),
			clearSessionSave: (token: string) => db.del(kvKey("save", token)),
			isSessionTokenBanned: async () => false,
		},
		getQRcode: {
			checkQRCodeResult: async () => {
				log.push("taptap");
				return qrResult;
			},
		},
	},
	lib: {
		loadSaveByToken: async (_rt: unknown, _db: unknown, token: string) =>
			token === TOKEN ? save : undefined,
	},
});

beforeEach(() => {
	kv.clear();
	log.length = 0;
	resetSaveBlobMemForTest();
	resetQrPollForTest();
	qrResult = { success: false, data: { error: "authorization_pending" } };
});

const QR = (userId: string) => kvKey("webQr", userId);
const qrSession = JSON.stringify({ deviceId: "d", data: {}, global: false });

test("a poll while the QR is shown reads only the QR session, not the bound token", async () => {
	kv.set(QR("p1"), qrSession);
	assert.deepEqual(await peekQrBind("p1"), { status: "waiting" });
	qrResult = { success: false, data: { error: "authorization_waiting" } };
	assert.deepEqual(await peekQrBind("p1"), { status: "scanned" });
	assert.equal(
		log.some((x) => x.includes(":userToken:")),
		false,
		log.join(" "),
	);
	assert.equal(log.filter((x) => x === "taptap").length, 2);
});

const PLAYER = {
	playerId: "Player",
	rks: 15.5,
	lastSynced: "2026-01-01T00:00:00.000Z",
};

test("TapTap rejecting a code that another tab's bind used reports the player", async () => {
	// This instance still has the QR session cached; the bind cleared it elsewhere
	kv.set(QR("p6"), qrSession);
	kv.set(kvKey("userToken", "p6"), TOKEN);
	qrResult = { success: false, data: { error: "expired_token" } };
	assert.deepEqual(await peekQrBind("p6"), PLAYER);
	assert.equal(kv.has(QR("p6")), false, "the QR session is cleared");
});

test("a dead code with no binding yet keeps waiting until the session expires", async () => {
	kv.set(QR("p7"), qrSession);
	qrResult = { success: false, data: { error: "invalid_grant" } };
	assert.deepEqual(await peekQrBind("p7"), { status: "waiting" });
	assert.equal(kv.has(QR("p7")), true, "a bind may still be saving");
});

test("a bind made elsewhere while the QR is pending shows within 10 s", async () => {
	kv.set(QR("p8"), qrSession);
	const orig = Date.now;
	let clock = 90_000_000;
	Date.now = () => clock;
	try {
		assert.deepEqual(await peekQrBind("p8"), { status: "waiting" });
		kv.set(kvKey("userToken", "p8"), TOKEN);
		clock += 2_000;
		assert.deepEqual(await peekQrBind("p8"), { status: "waiting" });
		const tokenReads = () =>
			log.filter((x) => x === `get:${kvKey("userToken", "p8")}`).length;
		assert.equal(tokenReads(), 0, "not on every poll");
		clock += 8_000;
		assert.deepEqual(await peekQrBind("p8"), PLAYER);
		assert.equal(tokenReads(), 1);
	} finally {
		Date.now = orig;
	}
});

test("a finished bind (QR cleared elsewhere) reports the player", async () => {
	kv.set(kvKey("userToken", "p2"), TOKEN);
	const out = await peekQrBind("p2");
	assert.deepEqual(out, {
		playerId: "Player",
		rks: 15.5,
		lastSynced: "2026-01-01T00:00:00.000Z",
	});
	assert.equal(log.includes("taptap"), false);
	assert.equal(
		log.filter((x) => x === `get:${kvKey("userToken", "p2")}`).length,
		1,
		"the token is read once",
	);
});

test("no QR and no binding: the QR expired", async () => {
	assert.deepEqual(await peekQrBind("p3"), {
		error: "qr_expired",
		status: 410,
	});
});

test("unbind never lists users and deletes the token-keyed save", async () => {
	kv.set(kvKey("userToken", "p4"), TOKEN);
	kv.set(kvKey("userToken", "other"), TOKEN);
	kv.set(kvKey("save", TOKEN), "{}");
	assert.deepEqual(await unbindAccount("p4"), { ok: true });
	await new Promise((r) => setTimeout(r, 5));
	assert.equal(kv.has(kvKey("userToken", "p4")), false);
	// The key is the session token, so it goes even if another account shares it
	// (that account recovers with a refresh)
	assert.equal(kv.has(kvKey("save", TOKEN)), false);
	assert.equal(
		log.some((x) => x.startsWith("list:")),
		false,
	);
	assert.equal(
		log.some((x) => x === `get:${kvKey("userToken", "other")}`),
		false,
		"other users' tokens are not read",
	);
});

test("unbinding with nothing bound is not_bound", async () => {
	assert.deepEqual(await unbindAccount("p5"), {
		error: "not_bound",
		status: 409,
	});
});
