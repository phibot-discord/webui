/** Takumi 2.13's own MAX_PIXMAP_PIXELS */
export const MAX_PIXMAP_PIXELS = 16 << 20;
export const PIXEL_RATIO = 2;

export type PaintQuality = "high" | "fast";
export type PaintSize = {
	width: number;
	height: number;
	ratio: number;
};

export function parsePaintQuality(raw: unknown): PaintQuality {
	return raw === "high" ? "high" : "fast";
}

function exact(w: number, h: number, ratio: number): PaintSize {
	return {
		width: Math.max(1, Math.round(w * ratio)),
		height: Math.max(1, Math.round(h * ratio)),
		ratio,
	};
}

function fillCap(w: number, h: number, maxRatio: number): PaintSize {
	const target = Math.min(maxRatio, Math.sqrt(MAX_PIXMAP_PIXELS / (w * h)));
	const pw = Math.max(1, Math.floor(w * target));
	let ph = Math.max(1, Math.floor(h * target));
	if (pw * ph > MAX_PIXMAP_PIXELS) {
		ph = Math.max(1, Math.floor(MAX_PIXMAP_PIXELS / pw));
	}
	const scale = Math.min(pw / w, ph / h);
	return { width: pw, height: ph, ratio: scale };
}

/** `maxRatio` defaults to `ratio`, so templates that do not opt in keep the 2× ceiling */
export function fitPaint(
	cssWidth: number,
	cssHeight: number,
	ratio = PIXEL_RATIO,
	quality: PaintQuality = "fast",
	maxRatio = ratio,
): PaintSize {
	const w = Math.max(1, cssWidth);
	const h = Math.max(1, cssHeight);
	const fits = (r: number) => w * h * r * r <= MAX_PIXMAP_PIXELS;
	if (quality === "high") {
		const top = Math.max(ratio, maxRatio);
		return fits(top) ? exact(w, h, top) : fillCap(w, h, top);
	}
	if (fits(ratio)) return exact(w, h, ratio);
	return { width: w, height: h, ratio: 1 };
}
