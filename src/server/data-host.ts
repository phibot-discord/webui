import type { PhiRuntime } from "@/phi/lib/runtime";
import { bootPhiRuntime } from "@/phi/lib/runtime";
import {
	getBoundToken,
	getToken,
	loadSave,
	loadSaveByToken,
	updateSave,
} from "@/phi/lib/saves";
import { loadWebConfig } from "./config";
import { connectKv, type KvStore } from "./kv";
import { logger } from "./logger";
import type { App, Kv } from "./sdk";

const dataLib = {
	loadSave,
	loadSaveByToken,
	updateSave,
	getToken,
	getBoundToken,
};

export type DataHost = {
	db: Kv;
	store: KvStore;
	rt: PhiRuntime;
	lib: typeof dataLib;
};

type GlobalData = typeof globalThis & {
	__phiDataHost?: Promise<DataHost>;
};

export function getDataHost(): Promise<DataHost> {
	const g = globalThis as GlobalData;
	if (!g.__phiDataHost) {
		g.__phiDataHost = bootData().catch((err) => {
			g.__phiDataHost = undefined;
			throw err;
		});
	}
	return g.__phiDataHost;
}

async function bootData(): Promise<DataHost> {
	const config = loadWebConfig();
	const { store, db } = await connectKv(config.kv);
	const services = new Map<string, unknown>([["kv", store]]);

	const app: App = {
		config,
		db,
		template: () => undefined,
		service: (name, value) => void services.set(name, value),
		getService: (name) => {
			if (!services.has(name)) throw new Error(`unknown service: ${name}`);
			return services.get(name) as never;
		},
		fonts: { fromDir: async () => undefined },
	};

	const rt = await bootPhiRuntime(app, { loadInfo: false });
	logger.ok("data host (kv only)");
	return { db, store, rt, lib: dataLib };
}
