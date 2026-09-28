import { join } from "node:path";
import type { Catalog } from "@/phi/lib/catalog";
import type { PhiRuntime } from "@/phi/lib/runtime";
import { loadWebConfig } from "./config";
import { type DataHost, getDataHost } from "./data-host";
import { assetsDir } from "./paths";
import type { PaintQuality } from "./render/paint-budget";
import type { App, RenderedImage, TemplateDefinition } from "./sdk";

export type { DataHost };

type RenderOpts = {
	heightKey?: string;
	height?: number;
	paintQuality?: PaintQuality;
};

export type WebHost = DataHost & {
	catalog: Catalog;
	render: (
		id: string,
		data?: Record<string, unknown>,
		opts?: RenderOpts,
	) => Promise<RenderedImage>;
};

type GlobalHost = typeof globalThis & {
	__phiWebHost?: Promise<WebHost>;
};

export async function getHost(): Promise<WebHost> {
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
		{ hydrateCss },
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

	const config = loadWebConfig();
	const resources = assetsDir();
	hydrateCss(PHI_CSS);
	const engine = new RenderEngine();
	const templates = new Map<string, TemplateDefinition>();
	const services = new Map<string, unknown>([["kv", data.store]]);

	const res = resources.replace(/\\/g, "/");
	const helpers = {
		resources,
		compileArt: (page: string, data: Record<string, unknown>) => {
			const file = page.endsWith(".art")
				? join(resources, "html", page)
				: join(resources, "html", `${page}.art`);
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

	const render = async (
		id: string,
		data: Record<string, unknown> = {},
		opts: RenderOpts = {},
	) => {
		const def = templates.get(id);
		if (!def) throw new Error(`unknown template: ${id}`);
		return engine.renderTemplate(def, data, helpers, opts);
	};

	const app: App = {
		config,
		db: data.db,
		template: (def) => {
			templates.set(def.id, def);
		},
		service: (name, value) => void services.set(name, value),
		getService: (name) => {
			if (!services.has(name)) throw new Error(`unknown service: ${name}`);
			return services.get(name) as never;
		},
		fonts: {
			fromDir: async (dir, map) => {
				for (const f of await loadFontsFromDir(dir, map))
					engine.registerFont(f);
			},
		},
	};

	await setupPhi(app);
	const rt = app.getService<PhiRuntime>("phi.runtime");
	const catalog = app.getService<Catalog>("phi.catalog");

	return { ...data, rt, catalog, render };
}
