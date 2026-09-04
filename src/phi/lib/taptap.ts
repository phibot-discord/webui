import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { tapFetch } from "./tapapi";

type PartialQR = {
	deviceId?: string;
	data?: {
		device_code?: string;
		expires_in?: number;
		qrcode_url?: string;
		interval?: number;
	};
	global?: boolean;
};

class CompleteQRCodeData {
	deviceID: string;
	deviceCode: string;
	expiresInSeconds?: number;
	url?: string;
	interval?: number;

	constructor(code: PartialQR) {
		this.deviceID = code.deviceId || "";
		this.deviceCode = code.data?.device_code || "";
		this.expiresInSeconds = code.data?.expires_in;
		this.url = code.data?.qrcode_url;
		this.interval = code.data?.interval;
	}
}

const TapSDKVersion = "2.1";

type TapLoginRegion = {
	clientId: string;
	appKey: string;
	webHost: string;
	apiHost: string;
	lcBase: string;
};

const CN_LOGIN: TapLoginRegion = {
	clientId: "rAK3FfdieFob2Nn8Am",
	appKey: "Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0",
	webHost: "https://accounts.tapapis.cn",
	apiHost: "https://open.tapapis.cn",
	lcBase: "https://rak3ffdi.cloud.tds1.tapapis.cn/1.1",
};

const GB_LOGIN: TapLoginRegion = {
	clientId: "kviehleldgxsagpozb",
	appKey: "tG9CTm0LDD736k9HMM9lBZrbeBGRmUkjSfNLDNib",
	webHost: "https://accounts.tapapis.com",
	apiHost: "https://open.tapapis.com",
	lcBase: "https://kviehlel.cloud.ap-sg.tapapis.com/1.1",
};

export function isGlobalTapLogin(
	request?: PartialQR,
	useGlobal = false,
): boolean {
	const url = request?.data?.qrcode_url || "";
	if (/taptap\.io|tapapis\.com/i.test(url)) return true;
	if (/taptap\.cn|tapapis\.cn/i.test(url)) return false;
	if (typeof request?.global === "boolean") return request.global;
	return useGlobal;
}

function tapLogin(useGlobal: boolean): TapLoginRegion {
	return useGlobal ? GB_LOGIN : CN_LOGIN;
}

function authorization(
	requestUrl: string,
	method: string,
	keyId: string,
	macKey: string,
) {
	const url = new URL(requestUrl);
	const time = Math.floor(Date.now() / 1000)
		.toString()
		.padStart(10, "0");
	const randomStr = randomBytes(16).toString("base64");
	const host = url.hostname;
	const uri = url.pathname + url.search;
	const port = url.port || (url.protocol === "https:" ? "443" : "80");
	const sign = createHmac("sha1", macKey)
		.update(`${time}\n${randomStr}\n${method}\n${uri}\n${host}\n${port}\n\n`)
		.digest("base64");
	return `MAC id="${keyId}", ts="${time}", nonce="${randomStr}", mac="${sign}"`;
}

async function requestLoginQrCode(
	permissions = ["public_profile"],
	useGlobal = false,
) {
	const tap = tapLogin(useGlobal);
	const deviceId = randomUUID().replace(/-/g, "");
	const params = new FormData();
	params.append("client_id", tap.clientId);
	params.append("response_type", "device_code");
	params.append("scope", permissions.join(","));
	params.append("version", TapSDKVersion);
	params.append("platform", "unity");
	params.append("info", JSON.stringify({ device_id: deviceId }));
	const endpoint = `${tap.webHost}/oauth2/v1/device/code`;
	const response = await tapFetch(endpoint, { method: "POST", body: params });
	const data = (await response.json()) as Record<string, unknown>;
	const nested =
		data.data && typeof data.data === "object"
			? (data.data as PartialQR["data"])
			: (data as PartialQR["data"]);
	return { deviceId, data: nested };
}

async function checkQRCodeResult(data: PartialQR, useGlobal = false) {
	const tap = tapLogin(isGlobalTapLogin(data, useGlobal));
	const qr = new CompleteQRCodeData(data);
	const params = new FormData();
	params.append("grant_type", "device_token");
	params.append("client_id", tap.clientId);
	params.append("secret_type", "hmac-sha-1");
	params.append("code", qr.deviceCode);
	params.append("version", "1.0");
	params.append("platform", "unity");
	params.append("info", JSON.stringify({ device_id: qr.deviceID }));
	const endpoint = `${tap.webHost}/oauth2/v1/token`;
	try {
		const response = await tapFetch(endpoint, { method: "POST", body: params });
		const data = (await response.json()) as Record<string, unknown>;
		if (data?.kid && data?.access_token && !data.data)
			return {
				success: true,
				data: data as { kid: string; access_token: string },
			};
		return data as {
			success?: boolean;
			data?: { error?: string; kid?: string; access_token?: string };
		};
	} catch {
		return null;
	}
}

async function getProfile(
	token: { scope?: string; kid: string; mac_key: string },
	useGlobal = false,
) {
	if (!token.scope?.includes("public_profile"))
		throw new Error("Public profile permission is required.");
	const tap = tapLogin(useGlobal);
	const url = `${tap.apiHost}/account/profile/v1?client_id=${tap.clientId}`;
	const response = await tapFetch(url, {
		method: "GET",
		headers: {
			Authorization: authorization(url, "GET", token.kid, token.mac_key),
		},
	});
	return response.json() as Promise<{ data?: Record<string, unknown> }>;
}

async function loginAndGetToken(
	data: Record<string, unknown>,
	withGlobal = false,
) {
	const tap = tapLogin(withGlobal);
	const url = `${tap.lcBase}/users`;
	const timestamp = Math.floor(Date.now() / 1000);
	const sign = `${createHash("md5").update(`${timestamp}${tap.appKey}`).digest("hex")},${timestamp}`;
	const response = await tapFetch(url, {
		method: "POST",
		headers: {
			"X-LC-Id": tap.clientId,
			"Content-Type": "application/json",
			"X-LC-Sign": sign,
		},
		body: JSON.stringify({ authData: { taptap: data } }),
	});
	return response.json() as Promise<{ sessionToken?: string }>;
}

export const getQRcode = {
	getRequest(useGlobal = false) {
		return requestLoginQrCode(undefined, useGlobal);
	},
	getQRcode(url: string, _useGlobal = false) {
		return QRCode.toBuffer(url, { scale: 10 });
	},
	checkQRCodeResult(request: PartialQR, useGlobal = false) {
		return checkQRCodeResult(request, useGlobal);
	},
	async getSessionToken(
		result: {
			data?: {
				kid?: string;
				access_token?: string;
				mac_key?: string;
				scope?: string;
			};
		},
		useGlobal = false,
	) {
		const token = result.data as {
			kid: string;
			mac_key: string;
			scope?: string;
			access_token?: string;
		};
		const profile = await getProfile(token, useGlobal);
		return (
			await loginAndGetToken({ ...profile.data, ...result.data }, useGlobal)
		).sessionToken;
	},
};
