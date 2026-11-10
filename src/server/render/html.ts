import { extname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { artFactories } from "@/phi/art-compiled";
import { exists } from "@/server/vfs";
import {
	type ArtFactory,
	type ArtRenderOptions,
	artImports,
	artKey,
	resolveArtPath,
} from "./art-runtime";
import { readAssetCached } from "./asset-cache";

const factories = artFactories as Record<string, ArtFactory>;

function renderOptions(filename: string): ArtRenderOptions {
	const options: ArtRenderOptions = {
		filename,
		resolveFilename: (src, opts) => resolveArtPath(src, opts.filename),
		include: (src, data, blocks, opts) => {
			const resolved = opts.resolveFilename(src, opts);
			const key = artKey(resolved);
			const factory = factories[key];
			if (!factory) throw new Error(`template not found: ${resolved}`);
			return factory(artImports, renderOptions(resolved))(
				data,
				blocks as object | undefined,
			);
		},
	};
	return options;
}

export function compileArt(
	file: string,
	data: Record<string, unknown>,
): string {
	const factory = factories[artKey(file)];
	if (!factory) throw new Error(`template not found: ${file}`);
	return factory(artImports, renderOptions(file))(data);
}

const SRC_RE = /\b(?:src|href)=["']([^"']+)["']/gi;

export type ImageAsset = { src: string; data: Buffer };

function localFileFromSpec(spec: string, baseDir: string): string | undefined {
	if (/^(data:|https?:|cid:|#|phi-css:)/i.test(spec)) return undefined;
	let file = spec.startsWith("file://")
		? decodeURIComponent(spec.replace(/^file:\/\//, ""))
		: spec;
	if (!isAbsolute(file) && !file.startsWith("phi-css://"))
		file = resolve(baseDir, file);
	return file;
}

export function collectLocalAssetPaths(
	html: string,
	baseDir: string,
): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const m of html.matchAll(SRC_RE)) {
		const spec = m[1];
		if (!spec) continue;
		const file = localFileFromSpec(spec, baseDir);
		if (!file || seen.has(file)) continue;
		seen.add(file);
		out.push(file);
	}
	return out;
}

export function rewriteLocalUrls(
	html: string,
	baseDir: string,
): { html: string; images: ImageAsset[] } {
	SRC_RE.lastIndex = 0;
	const images: ImageAsset[] = [];
	const seen = new Set<string>();
	const html2 = html.replace(SRC_RE, (m, spec: string) => {
		if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(spec)) {
			if (!seen.has(spec)) {
				seen.add(spec);
				images.push({
					src: spec,
					data: Buffer.from(spec.slice(spec.indexOf(",") + 1), "base64"),
				});
			}
			return m;
		}
		const file = localFileFromSpec(spec, baseDir);
		if (!file) return m;
		if (!exists(file)) return m;
		const url = file.startsWith("phi-css://") ? file : pathToFileURL(file).href;
		if (!seen.has(url) && isImage(file)) {
			seen.add(url);
			images.push({ src: url, data: readAssetCached(file) });
		}
		return m.replace(spec, url);
	});
	return { html: html2, images };
}

function isImage(file: string) {
	return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp"].includes(
		extname(file).toLowerCase(),
	);
}
