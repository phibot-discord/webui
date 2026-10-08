import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { kvKey } from "@/phi/lib/const";
import { finishTapLogin, peekTapLogin } from "./tap-login";

const LOGIN = "a".repeat(32);
const kv = new Map<string, string>();
let qrResult: unknown = null;
let logins = 0;

const db = {
	get: async (key: string) => kv.get(key),
	set: async (
		key: string,
		value: string,
		opts?: number | { nx?: boolean; ttlMs?: number },
	) => {
		if (typeof opts === "object" && opts.nx && kv.has(key)) return null;
		kv.set(key, value);
		return "OK";
	},
	del: async (...keys: string[]) => {
		for (const k of keys) kv.delete(k);
		return keys.length;
	},
};
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
	rt: {
		getQRcode: {
			checkQRCodeResult: async () => qrResult,
			login: async () => {
				logins += 1;
				return {};
			},
		},
	},
});

const QR = kvKey("webTapLogin", LOGIN);
const LOCK = kvKey("webTapLoginLock", LOGIN);
const qrSession = JSON.stringify({ deviceId: "d", data: {}, global: false });

beforeEach(() => {
	kv.clear();
	logins = 0;
	qrResult = { success: false, data: { error: "authorization_pending" } };
});

test("a pending sign-in waits, then shows the scan", async () => {
	kv.set(QR, qrSession);
	assert.deepEqual(await peekTapLogin(LOGIN), { status: "waiting" });
	qrResult = { success: false, data: { error: "authorization_waiting" } };
	assert.deepEqual(await peekTapLogin(LOGIN), { status: "scanned" });
});

test("a confirmed scan comes back to finish", async () => {
	kv.set(QR, qrSession);
	qrResult = { success: true, data: { kid: "k", access_token: "a" } };
	assert.deepEqual(await peekTapLogin(LOGIN), {
		resume: { result: qrResult, useGlobal: false },
	});
});

test("a denied or expired code ends the sign-in", async () => {
	kv.set(QR, qrSession);
	qrResult = { success: false, data: { error: "access_denied" } };
	assert.deepEqual(await peekTapLogin(LOGIN), {
		error: "qr_expired",
		status: 410,
	});
	assert.equal(kv.has(QR), false);
});

test("a used code while another poll finishes keeps waiting", async () => {
	kv.set(QR, qrSession);
	kv.set(LOCK, "1");
	qrResult = { success: false, data: { error: "invalid_grant" } };
	assert.deepEqual(await peekTapLogin(LOGIN), { status: "scanned" });
	assert.equal(kv.has(QR), true);
});

test("no sign-in under this cookie is expired", async () => {
	assert.deepEqual(await peekTapLogin(LOGIN), {
		error: "qr_expired",
		status: 410,
	});
});

test("only one poll finishes a sign-in", async () => {
	kv.set(QR, qrSession);
	kv.set(LOCK, "1");
	const out = await finishTapLogin(LOGIN, {
		result: { success: true, data: { kid: "k", access_token: "a" } },
		useGlobal: false,
	});
	assert.deepEqual(out, { error: "qr_busy", status: 409 });
	assert.equal(logins, 0, "TapTap is not asked twice");
});
