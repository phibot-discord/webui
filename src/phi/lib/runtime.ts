import type { KvStore } from "@/server/kv";
import { logger } from "@/server/logger";
import type { App } from "@/server/sdk";
import { ensureSongInfo } from "@/server/song-info";
import { initCredentials } from "./credentials";
import { fCompute } from "./fcompute";
import { getInfo } from "./get-info";
import { PhigrosUser } from "./phigros";
import { Save } from "./save";
import { getQRcode } from "./taptap";

export type PhiRuntime = {
	getInfo: typeof getInfo;
	PhigrosUser: typeof PhigrosUser;
	Save: typeof Save;
	fCompute: typeof fCompute;
	store: ReturnType<typeof initCredentials>;
	getQRcode: {
		getRequest: (useGlobal?: boolean) => Promise<{
			deviceId?: string;
			data?: {
				device_code?: string;
				expires_in?: number;
				qrcode_url?: string;
				interval?: number;
			};
		}>;
		getQRcode: (url: string, useGlobal?: boolean) => Promise<Buffer>;
		checkQRCodeResult: (
			request: unknown,
			useGlobal?: boolean,
		) => Promise<{
			success?: boolean;
			data?: { error?: string; kid?: string; access_token?: string };
		} | null>;
		getSessionToken: (
			result: unknown,
			useGlobal?: boolean,
		) => Promise<string | undefined>;
	};
};

export async function bootPhiRuntime(
	app: App,
	opts: { loadInfo?: boolean } = {},
): Promise<PhiRuntime> {
	const kv = app.getService<KvStore>("kv");
	if (opts.loadInfo !== false) await ensureSongInfo();
	const store = initCredentials(kv);
	logger.ok("phi runtime (getInfo + Save + TapTap) attached to KV");
	return {
		getInfo,
		PhigrosUser,
		Save,
		fCompute,
		store,
		getQRcode: getQRcode as PhiRuntime["getQRcode"],
	};
}
