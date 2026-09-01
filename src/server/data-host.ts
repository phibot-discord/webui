import type { PhiRuntime } from "@/phi/lib/runtime";
import { bootPhiRuntime } from "@/phi/lib/runtime";
import { getToken, loadSave, updateSave } from "@/phi/lib/saves";
import { loadWebConfig } from "./config";
import { connectKv, type KvStore } from "./kv";
import { logger } from "./logger";
import { appRoot } from "./paths";
import type { App, Kv } from "./sdk";

const dataLib = {
	loadSave,
	updateSave,
	getToken,
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
	const root = appRoot();
	const config = loadWebConfig();
	const { store, db } = await connectKv(config.kv);
	const services = new Map<string, unknown>();

	const app: App = {
		config,
		root,
		db,
		command: () => undefined,
		template: () => undefined,
		service: (name, value) => void services.set(name, value),
		getService: (name) => {
			if (!services.has(name)) throw new Error(`unknown service: ${name}`);
			return services.get(name) as never;
		},
		fonts: {
			register: () => undefined,
			fromDir: async () => undefined,
		},
		render: async () => {
			throw new Error("data host cannot render");
		},
		compile: async () => {
			throw new Error("data host cannot compile");
		},
		renderHtml: async () => {
			throw new Error("data host cannot render");
		},
		close: async () => {
			await db.close();
		},
	};

	app.service("kv", store);
	const rt = await bootPhiRuntime(app, { loadInfo: false });
	logger.ok("data host (kv only)");
	return { db, store, rt, lib: dataLib };
}
