import { createHash } from "node:crypto";
import sharp from "sharp";
import { exists, mkdirp, stat } from "@/server/vfs";

const cacheDir = "/tmp/phi-web-ill-blur";

function localFile(src: string): string | undefined {
	if (!src || /^(https?:|data:|cid:)/i.test(src)) return undefined;
	const file = src.startsWith("file://")
		? decodeURIComponent(src.replace(/^file:\/\//, ""))
		: src;
	if (!exists(file)) return undefined;
	return file;
}

export async function blurredFile(
	src: string,
	fallbackSigma = 10,
): Promise<string> {
	const file = localFile(src);
	if (!file) return src;
	if (/[/\\]illBlur[/\\]/.test(file)) return file;
	if (/Star[12]\.png$/i.test(file)) return file;
	const sigma = fallbackSigma;
	mkdirp(cacheDir);
	const st = stat(file);
	const key = createHash("sha1")
		.update(`${file}:${st.mtimeMs}:${st.size}:${sigma}:cover`)
		.digest("hex");
	const out = `${cacheDir}/${key}.png`;
	if (exists(out)) return out;
	await sharp(file)
		.rotate()
		.resize({ width: 1800, height: 1800, fit: "cover" })
		.blur(sigma)
		.modulate({ brightness: 0.62 })
		.png()
		.toFile(out);
	return out;
}

export async function blurCardBackgrounds(html: string): Promise<string> {
	const blockRe =
		/<div\b[^>]*class="[^"]*\bbackground\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
	let out = "";
	let last = 0;
	for (const m of html.matchAll(blockRe)) {
		const start = m.index ?? 0;
		out += html.slice(last, start);
		let block = m[0];
		const imgs = [...block.matchAll(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi)];
		for (let i = imgs.length - 1; i >= 0; i--) {
			const im = imgs[i]!;
			const at = im.index ?? 0;
			const blurred = await blurredFile(im[2]!);
			block = `${block.slice(0, at)}${im[1]}${blurred}${im[3]}${block.slice(at + im[0].length)}`;
		}
		out += block;
		last = start + m[0].length;
	}
	return out + html.slice(last);
}

/** Blurred ills are darkened ~0.62; 0.48 still treats navy as dark. */
const LIGHT_LUMA = 0.48;
const lumaCache = new Map<string, { top: number; bottom: number }>();
const LUMA_CACHE_MAX = 256;

function ink(lightBg: boolean) {
	return lightBg
		? {
				color: "#141414",
				shadow:
					"0 1px 2px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,0.55)",
			}
		: {
				color: "#f4f4f4",
				shadow: "0 1px 2px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.55)",
			};
}

async function sampleBandMedian(file: string, y0: number, y1: number) {
	const meta = await sharp(file).rotate().metadata();
	const w = meta.width || 1;
	const h = meta.height || 1;
	const top = Math.max(0, Math.min(h - 1, Math.floor(h * y0)));
	const height = Math.max(
		8,
		Math.min(h - top, Math.floor(h * Math.max(0.04, y1 - y0))),
	);
	const { data, info } = await sharp(file)
		.rotate()
		.extract({ left: 0, top, width: w, height })
		.resize(48, 12, { fit: "fill" })
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const values: number[] = [];
	for (let i = 0; i < data.length; i += info.channels) {
		values.push(
			0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!,
		);
	}
	if (!values.length) return 0.25;
	values.sort((a, b) => a - b);
	return (values[Math.floor(values.length / 2)] ?? 64) / 255;
}

function backgroundSrc(html: string) {
	const ill = /<div class="ill">\s*<img\b[^>]*\bsrc="([^"]+)"/i.exec(html)?.[1];
	if (ill) return ill;
	const star = /<img class="star-base"[^>]*src="([^"]+)"/i.exec(html)?.[1];
	if (star) return star;
	const block =
		/<div\b[^>]*class="[^"]*\bbackground\b[^"]*"[^>]*>[\s\S]*?<\/div>/i.exec(
			html,
		)?.[0];
	return block ? /<img\b[^>]*\bsrc="([^"]+)"/i.exec(block)?.[1] : undefined;
}

function inkCss(sel: string, lightBg: boolean) {
	const { color, shadow } = ink(lightBg);
	return `${sel} { color: ${color} !important; text-shadow: ${shadow} !important; }`;
}

export async function contrastOverBackground(html: string): Promise<string> {
	const src = backgroundSrc(html);
	const file = src ? localFile(src) : undefined;
	let topLight = false;
	let bottomLight = false;
	if (file) {
		try {
			const st = stat(file);
			const key = `${file}|${st.mtimeMs}|${st.size}`;
			let luma = lumaCache.get(key);
			if (!luma) {
				luma = {
					top: await sampleBandMedian(file, 0, 0.12),
					bottom: await sampleBandMedian(file, 0.88, 1),
				};
				if (lumaCache.size >= LUMA_CACHE_MAX) {
					const oldest = lumaCache.keys().next().value;
					if (oldest !== undefined) lumaCache.delete(oldest);
				}
				lumaCache.set(key, luma);
			}
			topLight = luma.top >= LIGHT_LUMA;
			bottomLight = luma.bottom >= LIGHT_LUMA;
		} catch {
			topLight = false;
			bottomLight = false;
		}
	}
	const css = `<style>
    ${inkCss(".playerInfo .date p, .row-date p, .descTip p", topLight)}
    ${inkCss(".tips p", bottomLight)}
  </style>`;
	if (html.includes("</head>")) return html.replace("</head>", `${css}</head>`);
	return css + html;
}
