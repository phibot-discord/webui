import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { kvKey } from "@/phi/lib/const";
import { resetSaveBlobMemForTest } from "@/phi/lib/saves";
import {
	linkTapToDiscord,
	noteTokenUser,
	tapSignInOpens,
	tapSignInUser,
} from "./account-link";
import { resetManualMemForTest } from "./manual";
import { resetShareMemForTest, userIdForSlug } from "./share";

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const OTHER = "zyxwvutsrqponmlkjihgfedcb";
const TAP = "tap:obj1";
const DISCORD = "123456789012345678";

const kv = new Map<string, string>();
const db = {
	get: async (key: string) => kv.get(key),
	set: async (key: string, value: string) => {
		kv.set(key, value);
	},
	del: async (...keys: string[]) => {
		for (const k of keys) kv.delete(k);
		return keys.length;
	},
};
const token = (userId: string) => kvKey("userToken", userId);
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
	rt: {
		store: {
			getSessionToken: (userId: string) => db.get(token(userId)),
			setSessionToken: (userId: string, value: string) =>
				db.set(token(userId), value),
			clearLocalCredentials: (userId: string) =>
				db.del(token(userId), kvKey("userApiId", userId)),
			clearSessionSave: (t: string) => db.del(kvKey("save", t)),
		},
	},
});

beforeEach(() => {
	kv.clear();
	resetSaveBlobMemForTest();
	resetShareMemForTest();
	resetManualMemForTest();
});

test("an unlinked TapTap account signs in as its own tap user", async () => {
	assert.equal(await tapSignInUser("obj1", TOKEN), TAP);
});

test("linking moves the bind, settings, snapshots and share link to Discord", async () => {
	kv.set(token(TAP), TOKEN);
	kv.set(kvKey("save", TOKEN), "{}");
	kv.set(kvKey("notes", TAP), '{"cardQuality":"high"}');
	kv.set(kvKey("hisb30", TAP), "[1]");
	kv.set(kvKey("webShare", "slug-abcdef12"), TAP);
	kv.set(kvKey("webShareUser", TAP), "slug-abcdef12");

	assert.deepEqual(await linkTapToDiscord(TAP, DISCORD), { ok: true });

	assert.equal(kv.get(token(DISCORD)), TOKEN);
	assert.equal(kv.get(kvKey("notes", DISCORD)), '{"cardQuality":"high"}');
	assert.equal(kv.get(kvKey("hisb30", DISCORD)), "[1]");
	assert.equal(await userIdForSlug("slug-abcdef12"), DISCORD);
	assert.equal(kv.get(kvKey("webShareUser", DISCORD)), "slug-abcdef12");
	for (const key of ["userToken", "notes", "hisb30", "webShareUser"])
		assert.equal(kv.has(kvKey(key, TAP)), false, key);
	assert.equal(kv.has(kvKey("save", TOKEN)), true);
	assert.equal(await tapSignInUser("obj1", TOKEN), DISCORD);
});

test("Discord's own settings win over the TapTap account's", async () => {
	kv.set(token(TAP), TOKEN);
	kv.set(token(DISCORD), TOKEN);
	kv.set(kvKey("notes", TAP), "tap");
	kv.set(kvKey("notes", DISCORD), "discord");
	assert.deepEqual(await linkTapToDiscord(TAP, DISCORD), { ok: true });
	assert.equal(kv.get(kvKey("notes", DISCORD)), "discord");
	assert.equal(kv.has(kvKey("notes", TAP)), false);
});

test("a Discord user holding another save refuses the link and keeps everything", async () => {
	kv.set(token(TAP), TOKEN);
	kv.set(token(DISCORD), OTHER);
	assert.deepEqual(await linkTapToDiscord(TAP, DISCORD), {
		error: "discord_taken",
	});
	assert.equal(kv.get(token(TAP)), TOKEN);
	assert.equal(kv.get(token(DISCORD)), OTHER);
	assert.equal(await tapSignInUser("obj1", TOKEN), TAP);
});

test("only tap users link, and only to a Discord snowflake", async () => {
	assert.deepEqual(await linkTapToDiscord(DISCORD, "223456789012345678"), {
		error: "link_failed",
	});
	assert.deepEqual(await linkTapToDiscord(TAP, "tap:obj2"), {
		error: "link_failed",
	});
});

test("a link goes stale once Discord binds another save", async () => {
	kv.set(token(TAP), TOKEN);
	assert.deepEqual(await linkTapToDiscord(TAP, DISCORD), { ok: true });
	kv.set(token(DISCORD), OTHER);
	assert.equal(await tapSignInUser("obj1", TOKEN), TAP);
	assert.equal(kv.has(kvKey("webTapLink", "obj1")), false);
	assert.equal(kv.has(kvKey("webDiscordTap", DISCORD)), false);
});

test("an unbound Discord user still opens through its link", async () => {
	kv.set(token(TAP), TOKEN);
	assert.deepEqual(await linkTapToDiscord(TAP, DISCORD), { ok: true });
	kv.delete(token(DISCORD));
	assert.equal(await tapSignInUser("obj1", TOKEN), DISCORD);
});

test("relinking Discord to another TapTap account drops the old link", async () => {
	kv.set(token(TAP), TOKEN);
	assert.deepEqual(await linkTapToDiscord(TAP, DISCORD), { ok: true });
	kv.delete(token(DISCORD));
	kv.set(token("tap:obj2"), OTHER);
	assert.deepEqual(await linkTapToDiscord("tap:obj2", DISCORD), { ok: true });
	assert.equal(kv.has(kvKey("webTapLink", "obj1")), false);
	assert.equal(kv.get(kvKey("webTapLink", "obj2")), DISCORD);
	assert.equal(kv.get(kvKey("webDiscordTap", DISCORD)), "obj2");
});

test("a TapTap sign-in opens the Discord user that bound the same save", async () => {
	kv.set(token(DISCORD), TOKEN);
	await noteTokenUser(DISCORD, TOKEN);
	assert.equal(await tapSignInOpens(DISCORD), true);
	assert.equal(await tapSignInUser("obj1", TOKEN), DISCORD);
	assert.equal(kv.get(kvKey("webTapLink", "obj1")), DISCORD);
	assert.equal(kv.get(kvKey("webDiscordTap", DISCORD)), "obj1");
});

test("a bot bind works the same: the TapTap account's own user folds in", async () => {
	kv.set(token(DISCORD), TOKEN);
	kv.set(kvKey("tokenUser", TOKEN), DISCORD);
	kv.set(token(TAP), TOKEN);
	kv.set(kvKey("notes", TAP), "tap");
	assert.equal(await tapSignInUser("obj1", TOKEN), DISCORD);
	assert.equal(kv.get(kvKey("notes", DISCORD)), "tap");
	assert.equal(kv.has(token(TAP)), false);
	assert.equal(kv.get(token(DISCORD)), TOKEN);
});

test("a Discord user that bound another save since then is not opened", async () => {
	kv.set(token(DISCORD), OTHER);
	kv.set(kvKey("tokenUser", TOKEN), DISCORD);
	assert.equal(await tapSignInUser("obj1", TOKEN), TAP);
	assert.equal(kv.has(kvKey("webTapLink", "obj1")), false);
	assert.equal(await tapSignInOpens(DISCORD), true);
	assert.equal(kv.get(kvKey("tokenUser", OTHER)), DISCORD);
});

test("a bound save nobody claims is claimed when the account page asks", async () => {
	kv.set(token(DISCORD), TOKEN);
	assert.equal(await tapSignInOpens(DISCORD), true);
	assert.equal(kv.get(kvKey("tokenUser", TOKEN)), DISCORD);
	assert.equal(await tapSignInUser("obj1", TOKEN), DISCORD);
});

test("a save another Discord user holds is never claimed", async () => {
	const SECOND = "223456789012345678";
	kv.set(token(DISCORD), TOKEN);
	kv.set(token(SECOND), TOKEN);
	kv.set(kvKey("tokenUser", TOKEN), SECOND);
	assert.equal(await tapSignInOpens(DISCORD), false);
	assert.equal(kv.get(kvKey("tokenUser", TOKEN)), SECOND);
});

test("tap users never claim a token", async () => {
	kv.set(token(TAP), TOKEN);
	await noteTokenUser(TAP, TOKEN);
	assert.equal(kv.has(kvKey("tokenUser", TOKEN)), false);
	assert.equal(await tapSignInUser("obj1", TOKEN), TAP);
});
