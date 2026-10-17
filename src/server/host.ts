import { join } from "node:path";
import { OG_SIZE } from "@/lib/og";
import type { Catalog } from "@/phi/lib/catalog";
import { loadWebConfig } from "./config";
import { type DataHost, getDataHost } from "./data-host";
import { logger } from "./logger";
import { assetsDir } from "./paths";
import {
	OG_PAGE_TEMPLATE,
	type OgPageData,
	ogPageHtml,
} from "./render/og-page";
import type { PaintQuality } from "./render/paint-budget";
import {
	type App,
	defineTemplate,
	type RenderedImage,
	type TemplateDefinition,
} from "./sdk";

export type { DataHost };

type RenderOpts = {
	heightKey?: string;
	height?: number;
	paintQuality?: PaintQuality;
	signal?: AbortSignal;
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
		fonts: {
			fromDir: async (dir, map) => {
				for (const f of await loadFontsFromDir(dir, map))
					engine.registerFont(f);
				// Decode the fonts during boot and data loading, not inside the first render
				engine.warmFonts().catch((err) => {
					logger.error(
						`font registration failed: ${err instanceof Error ? err.message : err}`,
					);
				});
			},
		},
	};

	const { catalog } = await setupPhi(app, data.rt);
	app.template(
		defineTemplate({
			id: OG_PAGE_TEMPLATE,
			...OG_SIZE,
			format: "jpeg",
			quality: 90,
			html: (raw) => ogPageHtml(raw as OgPageData),
		}),
	);

	return { ...data, catalog, render };
}
