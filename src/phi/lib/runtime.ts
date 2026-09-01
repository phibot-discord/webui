import { join } from "node:path";
import { logger } from "@/server/logger";
import type { KvStore } from "@/server/kv";
import type { App } from "@/server/sdk";
import { ensureSongInfo } from "@/server/song-info";
import { chartTag } from "./chart-tag";
import { initCredentials } from "./credentials";
import { fCompute } from "./fcompute";
import { getInfo } from "./get-info";
import { PhigrosUser } from "./phigros";
import { initRksRank } from "./rks-rank";
import { Save } from "./save";
import { getQRcode } from "./taptap";

export type PhiRuntime = {
	phiRoot: string;
	getInfo: typeof getInfo;
	PhigrosUser: typeof PhigrosUser;
	Save: typeof Save;
	fCompute: typeof fCompute;
	getRksRank: ReturnType<typeof initRksRank>;
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
	chartTag: typeof chartTag;
};

export async function bootPhiRuntime(
	app: App,
	opts: { loadInfo?: boolean } = {},
): Promise<PhiRuntime> {
	const kv = app.getService<KvStore>("kv");
	const dataDir = join(app.config.paths.data, "phi");
	if (opts.loadInfo !== false) await ensureSongInfo();
	const store = initCredentials(kv);
	const getRksRank = initRksRank(kv);
	await chartTag.attach(app.db);
	logger.ok("phi runtime (getInfo + Save + TapTap) attached to KV");
	return {
		phiRoot: dataDir,
		getInfo,
		PhigrosUser,
		Save,
		fCompute,
		getRksRank,
		store,
		getQRcode: getQRcode as PhiRuntime["getQRcode"],
		chartTag,
	};
}
