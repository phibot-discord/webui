import { join } from "node:path";
import { b19Card, infoCard } from "@/phi/lib/cards";
import type { Catalog } from "@/phi/lib/catalog";
import {
	buildHisb30Rows,
	loadHisb30Snaps,
	loadSaveHistory,
	playerBlock,
} from "@/phi/lib/history";
import { getNotes } from "@/phi/lib/notes";
import type { PhiRuntime } from "@/phi/lib/runtime";
import { loadWebConfig } from "./config";
import { type DataHost, getDataHost } from "./data-host";
import { appRoot, assetsDir } from "./paths";
import type { App, FontEntry, RenderedImage, TemplateDefinition } from "./sdk";

export type { DataHost };

type TemplateHelpers = {
	compileArt: (page: string, data: Record<string, unknown>) => string;
	resources: string;
};

export type WebHost = DataHost & {
	root: string;
	catalog: Catalog;
	render: (
		id: string,
		data?: Record<string, unknown>,
		opts?: { heightKey?: string },
	) => Promise<RenderedImage>;
	lib: DataHost["lib"] & {
		b19Card: typeof b19Card;
		infoCard: typeof infoCard;
		getNotes: typeof getNotes;
		loadHisb30Snaps: typeof loadHisb30Snaps;
		loadSaveHistory: typeof loadSaveHistory;
		buildHisb30Rows: typeof buildHisb30Rows;
		playerBlock: typeof playerBlock;
	};
};

type GlobalHost = typeof globalThis & {
	__phiWebHost?: Promise<WebHost>;
};

export function getHost(): Promise<WebHost> {
	const g = globalThis as GlobalHost;
	if (!g.__phiWebHost) {
		g.__phiWebHost = bootRender().catch((err) => {
			g.__phiWebHost = undefined;
			throw err;
		});
	}
	return g.__phiWebHost;
}

async function bootRender(): Promise<WebHost> {
	const data = await getDataHost();
	const [
		{ RenderEngine },
		{ loadFontsFromDir },
		{ compileArt },
		{ hydrateCss, mountDisk },
		{ PHI_CSS },
		{ setupPhi },
	] = await Promise.all([
		import("./render/engine"),
		import("./render/fonts"),
		import("./render/html"),
		import("./vfs"),
		import("@/phi/css/bundle"),
		import("@/phi/setup"),
	]);

	const root = appRoot();
	const config = loadWebConfig();
	const resources = assetsDir();
	mountDisk(resources);
	hydrateCss(PHI_CSS);
	const engine = new RenderEngine();
	const db = data.db;
	const store = data.store;
	const templates = new Map<string, TemplateDefinition>();
	const services = new Map<string, unknown>();
	const fonts: FontEntry[] = [];

	const helpers: TemplateHelpers = {
		resources,
		compileArt: (page, data) => {
			const file = page.endsWith(".art")
				? join(resources, "html", page)
				: join(resources, "html", `${page}.art`);
			const res = resources.replace(/\\/g, "/");
			return compileArt(file, {
				...data,
				defaultLayout: `${res}/html/common/layout/default.art`,
				_layout_path: `${res}/html/common/layout/`,
				_res_path: `${res}/`,
				pluResPath: `${res}/`,
				_imgPath: data._imgPath ?? `${res}/html/otherimg/`,
			});
		},
	};

	const compileId = async (id: string, data: Record<string, unknown> = {}) => {
		const def = templates.get(id);
		if (!def) throw new Error(`unknown template: ${id}`);
		const html = def.html
			? await def.html(data, helpers)
			: typeof def.render === "function"
				? await def.render(data, helpers)
				: null;
		if (typeof html !== "string")
			throw new Error(`template ${id} has neither html() nor render()`);
		return html;
	};

	const renderId = async (
		id: string,
		data: Record<string, unknown> = {},
		opts: { heightKey?: string } = {},
	) => {
		const def = templates.get(id);
		if (!def) throw new Error(`unknown template: ${id}`);
		return engine.renderTemplate(def, data, helpers, opts);
	};

	const app: App = {
		config,
		root,
		db,
		command: () => undefined,
		template: (def) => {
			templates.set(def.id, def);
		},
		service: (name, value) => void services.set(name, value),
		getService: (name) => {
			if (!services.has(name)) throw new Error(`unknown service: ${name}`);
			return services.get(name) as never;
		},
		fonts: {
			register: (entry) => {
				fonts.push(entry);
				engine.registerFont(entry);
			},
			fromDir: async (dir, map) => {
				const loaded = await loadFontsFromDir(dir, map);
				for (const f of loaded) {
					fonts.push(f);
					engine.registerFont(f);
				}
			},
		},
		render: renderId,
		compile: compileId,
		renderHtml: (html, opts) =>
			engine.renderHtml(html, {
				width: opts?.width ?? config.render.width,
				height: opts?.height,
				format: opts?.format ?? config.render.format,
				quality: opts?.quality ?? config.render.quality,
				baseDir: helpers.resources,
				id: opts?.id,
			}),
		close: async () => {
			await engine.close();
			await db.close();
		},
	};

	app.service("kv", store);
	await setupPhi(app);
	const rt = app.getService<PhiRuntime>("phi.runtime");
	const catalog = app.getService<Catalog>("phi.catalog");

	return {
		root,
		db,
		store,
		rt,
		catalog,
		render: renderId,
		lib: {
			...data.lib,
			b19Card,
			infoCard,
			getNotes,
			loadHisb30Snaps,
			loadSaveHistory,
			buildHisb30Rows,
			playerBlock,
		},
	};
}
