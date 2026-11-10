import { join } from "node:path";
import { type CardKind, isCardKind } from "@/server/card-kinds";
import { applyIllPaths, hydrateIlls } from "@/server/ill";
import { logger } from "@/server/logger";
import { phiCssHref } from "@/server/paths";
import { PHI_FONT_FILES } from "@/server/render/fonts";
import { collectLocalAssetPaths } from "@/server/render/html";
import { type App, defineTemplate } from "@/server/sdk";
import { ensureSongInfo } from "@/server/song-info";
import { readdir, stat } from "@/server/vfs";
import { blurCardBackgrounds, contrastOverBackground } from "./lib/blur";
import { cardCopy, resolvePhiLocale } from "./lib/card-i18n";
import { Catalog } from "./lib/catalog";
import { classicPrepare, stripInlineFilters } from "./lib/classic";
import type { PhiRuntime } from "./lib/runtime";
import { cardVariant } from "./lib/variants";

function cssLink(file: string) {
	return `<link rel="stylesheet" href="${phiCssHref(file)}">`;
}

function artPages(htmlRoot: string): { app: string; tpl: string }[] {
	const out: { app: string; tpl: string }[] = [];
	let dirs: string[] = [];
	try {
		dirs = readdir(htmlRoot);
	} catch {
		return out;
	}
	for (const app of dirs) {
		const dir = join(htmlRoot, app);
		try {
			if (!stat(dir).isDirectory()) continue;
			for (const f of readdir(dir)) {
				if (f.endsWith(".art")) out.push({ app, tpl: f.slice(0, -4) });
			}
		} catch {
			/* skip */
		}
	}
	return out;
}

function pickTip(tips: string[]): string {
	const list = tips.map((t) => t.trim()).filter(Boolean);
	if (!list.length) return "";
	return list[Math.floor(Math.random() * list.length)]!;
}

const TEMPLATE_WIDTH: Record<string, number> = {
	update: 800,
};

const TEMPLATE_MAX_RATIO: Record<string, number> = {
	update: 3,
};

/** Variant layouts get variant-base.css plus their own <tpl>.css; the classic templates link their own */
function polishVariantHtml(html: string, tpl: string) {
	let out = html.replace(/<title>[^<]*<\/title>/gi, "<title>phi</title>");
	out = out.replace(/<script\b[\s\S]*?<\/script>/gi, "");
	out = stripInlineFilters(out);
	const links = cssLink("variant-base.css") + cssLink(`${tpl}.css`);
	if (out.includes("</head>")) return out.replace("</head>", `${links}</head>`);
	return links + out;
}

function screenshotTheme(theme: unknown) {
	const t = String(theme || "default");
	if (t === "snow" || t === "topText" || t === "foolsDay") return "default";
	return t;
}

export async function setupPhi(
	app: App,
	runtime: PhiRuntime,
): Promise<{ catalog: Catalog }> {
	const resources = app.config.paths.phiResources;
	const fontDir = join(resources, "html/common/font");
	await app.fonts.fromDir(fontDir, PHI_FONT_FILES);

	await ensureSongInfo();
	const catalog = new Catalog(resources);
	logger.ok(`phi catalog: ${catalog.size} songs`);

	const scale = app.config.render.scale || 1;
	const pages = artPages(join(resources, "html"));
	const format = app.config.render.format;
	const quality = app.config.render.quality;
	const width = app.config.render.width;
	const res = resources.replace(/\\/g, "/");

	for (const { app: kind, tpl } of pages) {
		const id = `phi/${kind}/${tpl}`;
		const variant = cardVariant(tpl);
		app.template(
			defineTemplate({
				id,
				width:
					variant?.width ||
					TEMPLATE_WIDTH[tpl] ||
					TEMPLATE_WIDTH[kind] ||
					width,
				format: ["b19", "update", "userinfo", "song"].includes(kind)
					? "jpeg"
					: format,
				quality,
				maxRatio: variant
					? variant.maxRatio
					: (TEMPLATE_MAX_RATIO[tpl] ?? TEMPLATE_MAX_RATIO[kind]),
				html: async (raw, helpers) => {
					const d = raw as {
						theme?: unknown;
						tips?: unknown;
						locale?: unknown;
						hideRecordStats?: unknown;
						cardKind?: unknown;
					};
					const locale = resolvePhiLocale(d.locale);
					const t = cardCopy(locale);
					const tips = String(d.tips || pickTip(catalog.tips));
					const prepare = variant ? variant.prepare : classicPrepare(tpl);
					const data = prepare
						? await prepare(raw, {
								kind: (typeof d.cardKind === "string" && isCardKind(d.cardKind)
									? d.cardKind
									: kind === "update"
										? "hisb30"
										: "b30") as CardKind,
								locale,
								catalog,
								rt: runtime,
							})
						: raw;
					const compiled = helpers.compileArt(`${kind}/${tpl}`, {
						sys: { scale: `style="transform:scale(${scale})"` },
						Math,
						_imgPath: `${res}/html/otherimg/`,
						...data,
						locale,
						lang: locale === "zh" ? "zh-cn" : locale === "ja" ? "ja" : "en",
						t,
						tips,
						theme: screenshotTheme(d.theme),
					});
					let html = variant ? polishVariantHtml(compiled, tpl) : compiled;
					const map = await hydrateIlls(
						collectLocalAssetPaths(html, resources),
					);
					html = applyIllPaths(html, map);
					return contrastOverBackground(await blurCardBackgrounds(html));
				},
			}),
		);
	}
	logger.ok(`phi templates: ${pages.length} art pages (takumi)`);
	return { catalog };
}
