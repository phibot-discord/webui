import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
	avatarImage,
	avatarPath,
	rememberDiscordAvatar,
	signInAvatar,
} from "./avatar";

const DISCORD = "123456789012345678";
const DISCORD_SRC = `https://cdn.discordapp.com/avatars/${DISCORD}/abc.png`;
const NEWER_SRC = `https://cdn.discordapp.com/avatars/${DISCORD}/def.png`;
const TAP_SRC =
	"https://img3-tc.tapimg.com/avatars/etag/Fg.png/_tap_avatar.jpg";

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
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
});

const realFetch = globalThis.fetch;
let fetched: string[] = [];
function serve(type: string, body = new Uint8Array([1, 2, 3])) {
	globalThis.fetch = (async (url: URL | string) => {
		fetched.push(String(url));
		return new Response(body, { headers: { "content-type": type } });
	}) as typeof fetch;
}

beforeEach(() => {
	kv.clear();
	fetched = [];
	globalThis.fetch = realFetch;
});

test("a TapTap sign-in to a Discord user shows its Discord avatar", async () => {
	assert.equal(await signInAvatar(DISCORD, TAP_SRC), TAP_SRC);
	await rememberDiscordAvatar(DISCORD, DISCORD_SRC);
	assert.equal(await signInAvatar(DISCORD, TAP_SRC), DISCORD_SRC);
	assert.equal(await signInAvatar("tap:obj1", TAP_SRC), TAP_SRC);
});

test("only Discord avatars of Discord users are kept", async () => {
	await rememberDiscordAvatar(DISCORD, TAP_SRC);
	await rememberDiscordAvatar("tap:obj1", DISCORD_SRC);
	assert.equal(kv.size, 0);
});

test("a Discord sign-in replaces the kept avatar; an old session only fills a gap", async () => {
	await rememberDiscordAvatar(DISCORD, DISCORD_SRC, { replace: false });
	assert.equal(await signInAvatar(DISCORD, undefined), DISCORD_SRC);
	await rememberDiscordAvatar(DISCORD, NEWER_SRC);
	await rememberDiscordAvatar(DISCORD, DISCORD_SRC, { replace: false });
	assert.equal(await signInAvatar(DISCORD, undefined), NEWER_SRC);
});

test("the header loads this site's copy, versioned by source", () => {
	const path = avatarPath(TAP_SRC);
	assert.match(path ?? "", /^\/api\/me\/avatar\?v=[\w-]{12}$/);
	assert.notEqual(path, avatarPath(DISCORD_SRC));
	assert.equal(avatarPath("https://example.com/a.png"), undefined);
	assert.equal(avatarPath("http://cdn.discordapp.com/a.png"), undefined);
	assert.equal(avatarPath(null), undefined);
});

test("an avatar is fetched once at header size, then served from KV", async () => {
	serve("image/png");
	const first = await avatarImage(DISCORD_SRC);
	assert.deepEqual(first?.body, Buffer.from([1, 2, 3]));
	assert.equal(first?.type, "image/png");
	assert.deepEqual(fetched, [`${DISCORD_SRC}?size=64`]);
	const again = await avatarImage(DISCORD_SRC);
	assert.deepEqual(again, first);
	assert.equal(fetched.length, 1);
});

test("an avatar over the size cap is not kept, nor read when its size is declared", async () => {
	const size = 512 * 1024;
	let pulled = false;
	globalThis.fetch = (async () =>
		new Response(
			new ReadableStream(
				{
					pull: (body) => {
						pulled = true;
						body.enqueue(new Uint8Array(size));
						body.close();
					},
				},
				{ highWaterMark: 0 },
			),
			{
				headers: {
					"content-type": "image/png",
					"content-length": String(size),
				},
			},
		)) as typeof fetch;
	assert.equal(await avatarImage(TAP_SRC), undefined);
	assert.equal(pulled, false);
	serve("image/png", new Uint8Array(256 * 1024 + 1));
	assert.equal(await avatarImage(TAP_SRC), undefined);
	assert.equal(kv.size, 0);
});

test("no SVG, error page or foreign host is served", async () => {
	serve("image/svg+xml");
	assert.equal(await avatarImage(TAP_SRC), undefined);
	serve("text/html");
	assert.equal(await avatarImage(TAP_SRC), undefined);
	assert.equal(await avatarImage("https://example.com/a.png"), undefined);
	assert.equal(fetched.length, 2);
	assert.equal(kv.size, 0);
});
