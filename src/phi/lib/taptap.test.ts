import assert from "node:assert/strict";
import test from "node:test";
import { getQRcode } from "./taptap";

const GB_CLIENT = "kviehleldgxsagpozb";
const GB_LC = "https://kviehlel.cloud.ap-sg.tapapis.com/1.1/users";

type Capture = { url: string; clientId?: string; lcId?: string };

async function withFetch<T>(
	fn: (calls: Capture[]) => Promise<T>,
	respond: (url: string) => unknown = () => ({
		data: { error: "authorization_pending" },
	}),
): Promise<T> {
	const calls: Capture[] = [];
	const orig = globalThis.fetch;
	globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
		const href = String(url);
		const cap: Capture = { url: href };
		const body = init?.body;
		if (body instanceof FormData) {
			cap.clientId = String(body.get("client_id") || "");
		}
		const headers = new Headers(init?.headers);
		cap.lcId = headers.get("X-LC-Id") || undefined;
		calls.push(cap);
		return new Response(JSON.stringify(respond(href)), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}) as typeof fetch;
	try {
		return await fn(calls);
	} finally {
		globalThis.fetch = orig;
	}
}

test("global QR token poll uses tapapis.com even if useGlobal is omitted", async () => {
	await withFetch(async (calls) => {
		await getQRcode.checkQRCodeResult({
			deviceId: "dev",
			data: {
				device_code: "issued-on-com",
				qrcode_url: "https://accounts.taptap.io/device?qrcode=1&user_code=abcd",
			},
			global: false,
		});
		assert.equal(calls.length, 1);
		assert.match(calls[0]!.url, /accounts\.tapapis\.com\/oauth2\/v1\/token/);
		assert.doesNotMatch(calls[0]!.url, /tapapis\.cn/);
		assert.equal(calls[0]!.clientId, GB_CLIENT);
	});
});

test("global device code request uses international host and GB client id", async () => {
	await withFetch(
		async (calls) => {
			await getQRcode.getRequest(true);
			assert.equal(calls.length, 1);
			assert.match(
				calls[0]!.url,
				/accounts\.tapapis\.com\/oauth2\/v1\/device\/code/,
			);
			assert.equal(calls[0]!.clientId, GB_CLIENT);
		},
		() => ({
			data: {
				device_code: "x",
				expires_in: 300,
				qrcode_url: "https://accounts.taptap.io/device?qrcode=1&user_code=x",
				interval: 1,
			},
		}),
	);
});

test("CN QR token poll stays on tapapis.cn", async () => {
	await withFetch(async (calls) => {
		await getQRcode.checkQRCodeResult(
			{
				deviceId: "dev",
				data: {
					device_code: "issued-on-cn",
					qrcode_url:
						"https://accounts.taptap.cn/device?qrcode=1&user_code=abcd",
				},
			},
			true,
		);
		assert.equal(calls.length, 1);
		assert.match(calls[0]!.url, /accounts\.tapapis\.cn\/oauth2\/v1\/token/);
		assert.equal(calls[0]!.clientId, "rAK3FfdieFob2Nn8Am");
	});
});

test("global session login uses GB LeanCloud id and host", async () => {
	await withFetch(
		async (calls) => {
			const token = await getQRcode.getSessionToken(
				{
					data: {
						kid: "kid",
						access_token: "access",
						mac_key: "mac",
						scope: "public_profile",
					},
				},
				true,
			);
			assert.equal(token, "abcdefghijklmnopqrstuvwxy");
			const profile = calls.find((c) => c.url.includes("/account/profile/"));
			const login = calls.find((c) => c.url.includes("/users"));
			assert.ok(profile);
			assert.match(profile!.url, /open\.tapapis\.com/);
			assert.match(profile!.url, new RegExp(`client_id=${GB_CLIENT}`));
			assert.ok(login);
			assert.equal(login!.url, GB_LC);
			assert.equal(login!.lcId, GB_CLIENT);
		},
		(url) => {
			if (url.includes("/account/profile/")) {
				return { data: { openid: "o", name: "n" } };
			}
			return { sessionToken: "abcdefghijklmnopqrstuvwxy" };
		},
	);
});
