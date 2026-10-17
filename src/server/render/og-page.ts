import { escapeHtml } from "@/phi/lib/html";
import { clipEm, fitFontPx } from "@/phi/lib/text-fit";

export const OG_PAGE_TEMPLATE = "og/page";

export type OgPageData = {
	brand: string;
	title: string;
	lede: string;
	host: string;
	accent: string;
	backdrop?: string;
	tiles: string[];
};

const TEXT_W = 620;
const LEDE_PX = 28;
const LEDE_LINES = 3;

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1200px; height: 630px; background: #0b0d14; color: #f4f6fc; font-family: NotoSansSC, PHI, sans-serif; }
.og { position: relative; width: 1200px; height: 630px; overflow: hidden; }
.og-bg { position: absolute; left: 0; top: 0; width: 1200px; height: 630px; object-fit: cover; opacity: 0.5; }
.og-tiles { position: absolute; left: 610px; top: -120px; width: 720px; display: flex; flex-wrap: wrap; transform: rotate(-12deg); }
.og-tile { width: 320px; height: 169px; margin: 0 22px 22px 0; border-radius: 12px; object-fit: cover; }
.og-shade { position: absolute; left: 0; top: 0; width: 1200px; height: 630px; background: linear-gradient(90deg, rgba(9,11,18,0.97) 0%, rgba(9,11,18,0.92) 48%, rgba(9,11,18,0.25) 100%); }
.og-text { position: absolute; left: 76px; top: 0; width: ${TEXT_W}px; height: 630px; display: flex; flex-direction: column; justify-content: center; }
.og-brand { display: flex; align-items: center; font-family: Aldrich, NotoSansSC, sans-serif; font-size: 30px; letter-spacing: 4px; color: #e6eaf5; }
.og-bar { width: 12px; height: 34px; margin-right: 18px; border-radius: 2px; transform: skewX(-14deg); }
.og-title { margin-top: 30px; line-height: 1.12; font-weight: 700; }
.og-lede { margin-top: 24px; font-size: ${LEDE_PX}px; line-height: 1.5; color: #c3cadf; }
.og-host { position: absolute; left: 76px; bottom: 44px; font-family: Aldrich, NotoSansSC, sans-serif; font-size: 22px; letter-spacing: 1px; color: #8790ab; }
`;

export function ogPageHtml(d: OgPageData): string {
	const titlePx = Math.max(54, fitFontPx(d.title, TEXT_W, 84));
	const fit = clipEm(d.lede, (TEXT_W / LEDE_PX) * LEDE_LINES - 2);
	const lede = fit.cut ? `${fit.text.trimEnd()}…` : fit.text;
	const img = (cls: string, src: string) =>
		`<img class="${cls}" src="${escapeHtml(src)}" alt="">`;
	return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="og">${
		d.backdrop ? img("og-bg", d.backdrop) : ""
	}<div class="og-tiles">${d.tiles.map((t) => img("og-tile", t)).join("")}</div><div class="og-shade"></div><div class="og-text"><div class="og-brand"><div class="og-bar" style="background:${escapeHtml(d.accent)}"></div>${escapeHtml(d.brand)}</div><div class="og-title" style="font-size:${titlePx}px">${escapeHtml(d.title)}</div>${
		lede ? `<div class="og-lede">${escapeHtml(lede)}</div>` : ""
	}</div><div class="og-host">${escapeHtml(d.host)}</div></div></body></html>`;
}
