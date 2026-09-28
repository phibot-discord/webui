import { createHash } from "node:crypto";
import { Renderer } from "@takumi-rs/core";
import sharp from "sharp";
import { render, setGlyphCacheMaxBytes } from "takumi-js";
import { fromHtml } from "takumi-js/helpers/html";
import { logger } from "../logger";
import { renderLock } from "../render-lock";
import type {
	FontEntry,
	RenderedImage,
	RenderFormat,
	TemplateDefinition,
} from "../sdk";
import { exists } from "../vfs";
import { readAssetCached } from "./asset-cache";
import {
	collectRootVars,
	collectStylesheets,
	resolveCssVars,
	stripScripts,
	stripUnsupportedCss,
} from "./css";
import { PHI_FONT_FAMILIES } from "./fonts";
import {
	type ImageAsset,
	rewriteLegacyPhiPluginPaths,
	rewriteLocalUrls,
} from "./html";
import { fitPaint, type PaintQuality, PIXEL_RATIO } from "./paint-budget";
import { fitPaintImages } from "./paint-images";

setGlyphCacheMaxBytes(64 * 1024 * 1024);
const RENDERER_CACHE_BYTES = 512 * 1024 * 1024;
const MEASURE_VIEWPORT_H = 16_000;
const heightCache = new Map<string, number>();
const HEIGHT_CACHE_MAX = 200;

function wrapPixelRoot(html: string, cssWidth: number, ratio: number) {
	const scale =
		ratio === 1 ? "" : `transform:scale(${ratio});transform-origin:0 0;`;
	const root = `<div class="phi-pixel-root" style="width:${cssWidth}px;${scale}">`;
	if (/<body\b/i.test(html)) {
		const opened = html.replace(/<body\b([^>]*)>/i, `<body$1>${root}`);
		return /<\/body>/i.test(opened)
			? opened.replace(/<\/body>/i, "</div></body>")
			: `${opened}</div>`;
	}
	return `${root}${html}</div>`;
}

function rootBoxCss(cssWidth: number) {
	return `html, body { position: relative !important; width: ${cssWidth}px !important; height: auto !important; min-height: min-content !important; overflow: visible !important; transform: none !important; }`;
}

function pixelRootCss(cssWidth: number, transform?: string) {
	const reset = transform ? `transform: ${transform} !important; ` : "";
	return `.phi-pixel-root { width: ${cssWidth}px !important; ${reset}transform-origin: 0 0 !important; overflow: visible !important; }`;
}

function rememberHeight(key: string, height: number) {
	if (heightCache.size >= HEIGHT_CACHE_MAX) {
		const oldest = heightCache.keys().next().value;
		if (oldest !== undefined) heightCache.delete(oldest);
	}
	heightCache.set(key, height);
}

const cssTransformCache = new Map<string, string>();
const CSS_CACHE_MAX = 256;

function transformSheet(
	sheet: string,
	vars: Map<string, string>,
	varsKey: string,
): string {
	const key = createHash("sha1")
		.update(varsKey)
		.update("\0")
		.update(sheet)
		.digest("hex");
	const hit = cssTransformCache.get(key);
	if (hit !== undefined) {
		cssTransformCache.delete(key);
		cssTransformCache.set(key, hit);
		return hit;
	}
	const out = stripUnsupportedCss(resolveCssVars(sheet, vars));
	if (cssTransformCache.size >= CSS_CACHE_MAX) {
		const oldest = cssTransformCache.keys().next().value;
		if (oldest !== undefined) cssTransformCache.delete(oldest);
	}
	cssTransformCache.set(key, out);
	return out;
}

function fmtMs(ms: number) {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function withHtmlMs(img: RenderedImage, htmlMs: number): RenderedImage {
	return { ...img, timings: { ...img.timings, htmlMs } };
}

function mime(format: RenderFormat) {
	return format === "jpeg"
		? "image/jpeg"
		: format === "webp"
			? "image/webp"
			: "image/png";
}

function ext(format: RenderFormat) {
	return format === "jpeg" ? "jpg" : format;
}

function collectCssImages(css: string): ImageAsset[] {
	const out: ImageAsset[] = [];
	const re = /url\("?(file:[^")]+|phi-css:[^")]+)"?\)/gi;
	const seen = new Set<string>();
	let m = re.exec(css);
	while (m) {
		const src = m[1];
		if (!src || seen.has(src)) {
			m = re.exec(css);
			continue;
		}
		seen.add(src);
		const file = src.startsWith("file:")
			? decodeURIComponent(src.replace(/^file:\/\//, ""))
			: src;
		if (exists(file)) out.push({ src, data: readAssetCached(file) });
		m = re.exec(css);
	}
	return out;
}

function contentExtent(n: {
	height: number;
	transform?: number[];
	children?: unknown[];
}): number {
	const ty = n.transform?.[5] ?? 0;
	let max = ty + (n.height || 0);
	for (const c of (n.children || []) as (typeof n)[])
		max = Math.max(max, contentExtent(c));
	return max;
}

export class RenderEngine {
	private renderer: Renderer | undefined;
	private fonts: FontEntry[] = [];
	private fontsRegistered = false;

	async init() {
		this.renderer = new Renderer({ cacheMaxBytes: RENDERER_CACHE_BYTES });
		logger.ok("takumi renderer");
	}

	registerFont(entry: FontEntry) {
		this.fonts.push(entry);
		this.fontsRegistered = false;
	}

	private async getRenderer(): Promise<Renderer> {
		if (!this.renderer) await this.init();
		if (!this.renderer) throw new Error("takumi renderer not initialized");
		return this.renderer;
	}

	private async ensureFonts(): Promise<Renderer> {
		const renderer = await this.getRenderer();
		if (this.fontsRegistered) return renderer;
		for (const f of this.fonts) {
			await renderer.registerFont({
				name: f.name,
				data: f.data,
				weight: f.weight ?? 400,
				style: f.style ?? "normal",
				generic: f.generic,
			});
		}
		this.fontsRegistered = true;
		return renderer;
	}

	async renderHtml(
		rawHtml: string,
		opts: {
			width?: number;
			height?: number;
			format?: RenderFormat;
			quality?: number;
			baseDir?: string;
			id?: string;
			heightKey?: string;
			paintQuality?: PaintQuality;
			maxRatio?: number;
		} = {},
	): Promise<RenderedImage> {
		const started = performance.now();
		const renderer = await this.ensureFonts();
		const width = opts.width ?? 1200;
		const format = opts.format ?? "png";
		const quality = opts.quality ?? 90;
		const maxRatio = opts.maxRatio ?? PIXEL_RATIO;
		const baseDir = opts.baseDir ?? process.cwd();
		const id = opts.id || "html";

		// Jackets were already hydrated by the template's html() step.
		let html = stripScripts(rewriteLegacyPhiPluginPaths(rawHtml, baseDir));
		const sheets = collectStylesheets(html, baseDir);
		html = sheets.html;
		const rewritten = rewriteLocalUrls(html, baseDir);
		html = rewritten.html;
		const inline: string[] = [];
		html = html.replace(
			/<style\b[^>]*>([\s\S]*?)<\/style>/gi,
			(_m, css: string) => {
				inline.push(css);
				return "";
			},
		);

		const prepared = html;
		// `<style>` blocks were pulled into `inline` above, so fromHtml() has no CSS to add.
		const rawSheets = [
			...sheets.sheets,
			`.help_box, .line { overflow: visible !important; max-height: none !important; }`,
			...inline,
		];
		const vars = new Map<string, string>();
		for (const s of rawSheets) collectRootVars(s, vars);
		const varsKey = createHash("sha1")
			.update([...vars].flat().join("\0"))
			.digest("hex");
		const sharedSheets = rawSheets.map((s) => transformSheet(s, vars, varsKey));
		const layoutCss = [
			...sharedSheets,
			rootBoxCss(width),
			pixelRootCss(width, "none"),
		];
		const tAssets = performance.now();
		const images = await fitPaintImages(
			[...rewritten.images, ...layoutCss.flatMap(collectCssImages)].map(
				(i) => ({
					src: i.src,
					data: i.data instanceof Uint8Array ? i.data : new Uint8Array(i.data),
					cache: "auto" as const,
				}),
			),
		);
		const assetsMs = performance.now() - tAssets;

		const paintQuality = opts.paintQuality ?? "fast";
		let height = opts.height;
		const heightKey = opts.heightKey
			? `${opts.heightKey}|w${width}`
			: undefined;
		let heightCached: "hit" | "miss" | undefined;
		if (height && height > 64 && heightKey) {
			heightCached = "hit";
			rememberHeight(heightKey, height);
			logger.info(`height cache hit ${heightKey} → ${height}`);
		} else if (!height && heightKey) {
			const cached = heightCache.get(heightKey);
			if (cached && cached > 64) {
				height = cached;
				heightCached = "hit";
				logger.info(`height cache hit ${heightKey} → ${cached}`);
			}
		}
		// With a known height the paint tree (a JS-side HTML parse) is built before
		// taking the raster lock, so it overlaps another render's raster instead of
		// serialising behind it. The measure tree is only parsed when measuring.
		const knownPaint = height
			? fitPaint(width, height, PIXEL_RATIO, paintQuality, maxRatio)
			: undefined;
		const preparedPaintTree = knownPaint
			? fromHtml(wrapPixelRoot(prepared, width, knownPaint.ratio))
			: undefined;

		const {
			encoded,
			ratio,
			measureMs,
			height: paintedHeight,
		} = await renderLock.run(async () => {
			let measureMs: number | undefined;
			if (!height) {
				const tMeasure = performance.now();
				const layoutTree = fromHtml(wrapPixelRoot(prepared, width, 1));
				const measured = await renderer.measure(layoutTree.node, {
					width,
					height: MEASURE_VIEWPORT_H,
					css: layoutCss,
					images,
					fontFamilies: [...PHI_FONT_FAMILIES],
					lang: "zh-CN",
				});
				const boxH = measured.height || 0;
				const extent = Math.max(1, Math.ceil(contentExtent(measured)));
				let raw = Math.max(boxH, extent);
				if (
					extent >= MEASURE_VIEWPORT_H - 1 &&
					boxH > 64 &&
					boxH + 24 < extent
				) {
					raw = boxH;
				}
				height = Math.min(MEASURE_VIEWPORT_H, Math.max(1, Math.ceil(raw) + 24));
				measureMs = performance.now() - tMeasure;
				if (heightKey) heightCached = "miss";
				logger.info(
					`measured box ${measured.width}x${measured.height} content ${extent} using ${height}`,
				);
				if (heightKey && height > 64) rememberHeight(heightKey, height);
			}

			const paint =
				knownPaint ??
				fitPaint(width, height, PIXEL_RATIO, paintQuality, maxRatio);
			if (paint.ratio < PIXEL_RATIO) {
				logger.warn(
					`paint ${id} ${width}x${height} ratio ${paint.ratio.toFixed(3)} (Takumi ${paint.width}x${paint.height})`,
				);
			}
			const paintTree =
				preparedPaintTree ??
				fromHtml(wrapPixelRoot(prepared, width, paint.ratio));
			const paintCss = [
				...sharedSheets,
				rootBoxCss(width),
				pixelRootCss(width),
			];
			const encoded = await this.encodeNode(paintTree.node, {
				width: paint.width,
				height: paint.height,
				format,
				quality,
				css: paintCss,
				images,
			});
			return { encoded, height, ratio: paint.ratio, measureMs };
		});
		height = paintedHeight;

		const ms = performance.now() - started;
		const ratioLabel = Number.isInteger(ratio)
			? String(ratio)
			: ratio.toFixed(3);
		const split =
			encoded.rasterMs != null && encoded.encodeMs != null
				? ` (raster ${fmtMs(encoded.rasterMs)} ${encoded.ext} ${fmtMs(encoded.encodeMs)})`
				: "";
		logger.ok(
			`card ${id} ${width}x${height} @${ratioLabel}x ${paintQuality} ${encoded.ext} ${encoded.bytes.length}B in ${Math.round(ms)}ms${split}`,
		);
		return {
			bytes: encoded.bytes,
			mime: encoded.mime,
			ext: encoded.ext,
			width,
			height,
			timings: {
				assetsMs,
				measureMs,
				rasterMs: encoded.rasterMs,
				encodeMs: encoded.encodeMs,
				paintMs: ms,
				heightCache: heightCached,
			},
		};
	}

	private async encodeNode(
		node: unknown,
		opts: {
			width: number;
			height: number;
			format: RenderFormat;
			quality: number;
			css?: string[];
			images?: { src: string; data: Uint8Array }[];
		},
	): Promise<{
		bytes: Buffer;
		mime: string;
		ext: string;
		rasterMs?: number;
		encodeMs?: number;
	}> {
		const base = {
			renderer: this.renderer,
			width: opts.width,
			height: opts.height,
			css: opts.css,
			images: opts.images,
			emoji: "noto" as const,
			fontFamilies: [...PHI_FONT_FAMILIES],
			lang: "zh-CN",
		};
		const t0 = performance.now();
		const raw = Buffer.from(
			await render(
				node as never,
				{
					...base,
					format: "raw",
				} as Parameters<typeof render>[1],
			),
		);
		const rasterMs = performance.now() - t0;
		const expected = opts.width * opts.height * 4;
		if (raw.byteLength !== expected) {
			throw new Error(
				`raw pixmap ${raw.byteLength}B != ${opts.width}x${opts.height}x4 (${expected}B)`,
			);
		}
		const t1 = performance.now();
		const pipeline = sharp(raw, {
			raw: { width: opts.width, height: opts.height, channels: 4 },
		});
		const bytes =
			opts.format === "jpeg"
				? await pipeline.jpeg({ quality: opts.quality }).toBuffer()
				: opts.format === "webp"
					? await pipeline.webp({ quality: opts.quality }).toBuffer()
					: await pipeline.png({ compressionLevel: 1 }).toBuffer();
		return {
			bytes,
			mime: mime(opts.format),
			ext: ext(opts.format),
			rasterMs,
			encodeMs: performance.now() - t1,
		};
	}

	async renderTemplate(
		def: TemplateDefinition,
		data: Record<string, unknown>,
		helpers: {
			compileArt: (page: string, data: Record<string, unknown>) => string;
			resources: string;
		},
		opts: {
			heightKey?: string;
			height?: number;
			paintQuality?: PaintQuality;
		} = {},
	): Promise<RenderedImage> {
		const started = performance.now();
		const tHtml = performance.now();
		const html = await def.html(data, helpers);
		const htmlMs = performance.now() - tHtml;
		const img = await this.renderHtml(html, {
			width: def.width,
			height: opts.height ?? def.height,
			format: def.format,
			quality: def.quality,
			baseDir: helpers.resources,
			id: def.id,
			heightKey: opts.heightKey,
			paintQuality: opts.paintQuality,
			maxRatio: def.maxRatio,
		});
		logger.info(
			`renderTemplate ${def.id} total ${fmtMs(performance.now() - started)}`,
		);
		return withHtmlMs(img, htmlMs);
	}

	async close() {
		this.renderer = undefined;
	}
}
