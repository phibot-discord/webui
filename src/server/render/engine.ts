import { createHash } from "node:crypto";
import { Renderer } from "@takumi-rs/core";
import { render, setGlyphCacheMaxBytes } from "takumi-js";
import { fromHtml } from "takumi-js/helpers/html";
import { applyIllPaths, hydrateIlls } from "../ill";
import { logger } from "../logger";
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
import {
	collectLocalAssetPaths,
	type ImageAsset,
	rewriteLegacyPhiPluginPaths,
	rewriteLocalUrls,
} from "./html";

setGlyphCacheMaxBytes(64 * 1024 * 1024);
const RENDERER_CACHE_BYTES = 256 * 1024 * 1024;
const heightCache = new Map<string, number>();
const HEIGHT_CACHE_MAX = 200;

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
		} = {},
	): Promise<RenderedImage> {
		const started = performance.now();
		const renderer = await this.ensureFonts();
		const width = opts.width ?? 1200;
		const format = opts.format ?? "png";
		const quality = opts.quality ?? 90;
		const baseDir = opts.baseDir ?? process.cwd();
		const id = opts.id || "html";

		let html = stripScripts(rewriteLegacyPhiPluginPaths(rawHtml, baseDir));
		html = applyIllPaths(
			html,
			await hydrateIlls(collectLocalAssetPaths(html, baseDir)),
		);
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

		const parsed = fromHtml(html);
		const rawSheets = [
			...sheets.sheets,
			...(parsed.stylesheets || []),
			`html, body { position: relative !important; width: ${width}px !important; height: auto !important; min-height: min-content !important; overflow: visible !important; transform: none !important; }`,
			`.help_box, .line { overflow: visible !important; max-height: none !important; }`,
			...inline,
		];
		const vars = new Map<string, string>();
		for (const s of rawSheets) collectRootVars(s, vars);
		const varsKey = createHash("sha1")
			.update([...vars].flat().join("\0"))
			.digest("hex");
		const stylesheets = rawSheets.map((s) => transformSheet(s, vars, varsKey));
		const images = [
			...rewritten.images,
			...stylesheets.flatMap(collectCssImages),
		].map((i) => ({
			src: i.src,
			data: i.data instanceof Uint8Array ? i.data : new Uint8Array(i.data),
		}));

		let height = opts.height;
		const heightKey = opts.heightKey
			? `${opts.heightKey}|w${width}`
			: undefined;
		if (!height && heightKey) {
			const cached = heightCache.get(heightKey);
			if (cached && cached > 64) {
				height = cached;
				logger.info(`height cache hit ${heightKey} → ${cached}`);
			}
		}
		if (!height) {
			const measured = await renderer.measure(parsed.node, {
				width,
				height: 16_000,
				stylesheets,
				images,
			});
			const boxH = measured.height || 0;
			const extent = Math.max(1, Math.ceil(contentExtent(measured)));
			if (boxH < 64) height = extent;
			else if (boxH >= 400 && extent > boxH * 2.5)
				height = Math.max(1, Math.ceil(boxH));
			else height = extent;
			logger.info(
				`measured box ${measured.width}x${measured.height} content ${extent} using ${height}`,
			);
			if (heightKey && height > 64) rememberHeight(heightKey, height);
		}

		const encoded = await this.encodeNode(parsed.node, {
			width,
			height,
			format,
			quality,
			stylesheets,
			images,
		});

		const ms = performance.now() - started;
		logger.ok(
			`card ${id} ${width}x${height} ${encoded.ext} ${encoded.bytes.length}B in ${Math.round(ms)}ms`,
		);
		return { ...encoded, width, height };
	}

	private async encodeNode(
		node: unknown,
		opts: {
			width: number;
			height: number;
			format: RenderFormat;
			quality: number;
			stylesheets?: string[];
			images?: { src: string; data: Uint8Array }[];
		},
	): Promise<{ bytes: Buffer; mime: string; ext: string }> {
		const bytes = Buffer.from(
			await render(
				node as never,
				{
					renderer: this.renderer,
					width: opts.width,
					height: opts.height,
					format: opts.format,
					quality: opts.quality,
					stylesheets: opts.stylesheets,
					images: opts.images,
					emoji: "noto",
				} as Parameters<typeof render>[1],
			),
		);
		return { bytes, mime: mime(opts.format), ext: ext(opts.format) };
	}

	async renderTemplate(
		def: TemplateDefinition,
		data: Record<string, unknown>,
		helpers: {
			compileArt: (page: string, data: Record<string, unknown>) => string;
			resources: string;
		},
		opts: { heightKey?: string } = {},
	): Promise<RenderedImage> {
		const started = performance.now();
		let img: RenderedImage;
		if (typeof def.render === "function") {
			const node = await def.render(data, helpers);
			if (node && typeof node !== "string") {
				img = await this.renderJsx(node, def);
				logger.info(
					`renderTemplate ${def.id} total ${fmtMs(performance.now() - started)}`,
				);
				return img;
			}
			if (typeof node === "string") {
				img = await this.renderHtml(node, {
					width: def.width,
					height: def.height,
					format: def.format,
					quality: def.quality,
					baseDir: helpers.resources,
					id: def.id,
					heightKey: opts.heightKey,
				});
				logger.info(
					`renderTemplate ${def.id} total ${fmtMs(performance.now() - started)}`,
				);
				return img;
			}
		}
		if (!def.html)
			throw new Error(`template ${def.id} has neither html() nor render()`);
		const html = await def.html(data, helpers);
		img = await this.renderHtml(html, {
			width: def.width,
			height: def.height,
			format: def.format,
			quality: def.quality,
			baseDir: helpers.resources,
			id: def.id,
			heightKey: opts.heightKey,
		});
		logger.info(
			`renderTemplate ${def.id} total ${fmtMs(performance.now() - started)}`,
		);
		return img;
	}

	private async renderJsx(
		node: unknown,
		def: TemplateDefinition,
	): Promise<RenderedImage> {
		const started = performance.now();
		await this.ensureFonts();
		const width = def.width ?? 1200;
		const height = def.height ?? 1800;
		const format = def.format ?? "png";
		const quality = def.quality ?? 90;
		const encoded = await this.encodeNode(node, {
			width,
			height,
			format,
			quality,
		});
		logger.ok(
			`card ${def.id} ${width}x${height} ${encoded.ext} ${encoded.bytes.length}B in ${Math.round(performance.now() - started)}ms`,
		);
		return { ...encoded, width, height };
	}

	async close() {
		this.renderer = undefined;
	}
}
