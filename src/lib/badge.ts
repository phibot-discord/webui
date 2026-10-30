export type BadgeInput = {
	name: string;
	rks?: number;
	challenge?: number;
};

export const BADGE_STYLES = [
	"flat",
	"flat-square",
	"for-the-badge",
	"rks",
	"card",
	"card-dark",
] as const;
export type BadgeStyle = (typeof BADGE_STYLES)[number];

const FONT = "Verdana,Geneva,DejaVu Sans,sans-serif";
const NAME_MAX = 24;

const CHALLENGE_COLORS = [
	"#6b7280",
	"#3f9b4b",
	"#2f6fb7",
	"#c0392b",
	"#c99a1e",
	"url(#rainbow)",
];

const RAINBOW =
	'<linearGradient id="rainbow" x2="100%" y2="0"><stop offset="0" stop-color="#e5484d"/><stop offset=".33" stop-color="#e5a50a"/><stop offset=".66" stop-color="#30a46c"/><stop offset="1" stop-color="#3e63dd"/></linearGradient>';

export function parseBadgeStyle(raw: string | null | undefined): BadgeStyle {
	return (BADGE_STYLES as readonly string[]).includes(raw ?? "")
		? (raw as BadgeStyle)
		: "flat";
}

export function escapeXml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export function textWidth(text: string, size = 11): number {
	let w = 0;
	for (const ch of text) {
		const code = ch.codePointAt(0) ?? 0;
		if (code > 0x2e80) w += 11;
		else if ("ilI.,:;|!'".includes(ch)) w += 3.5;
		else if ("mwMW@".includes(ch)) w += 10;
		else if (ch === " ") w += 3.6;
		else if (/[A-Z0-9]/.test(ch)) w += 7.5;
		else w += 6.5;
	}
	return Math.ceil((w * size) / 11);
}

export function clipName(raw: string, max = NAME_MAX): string {
	const chars = [...raw.replace(/\s+/g, " ").trim()];
	if (!chars.length) return "player";
	return chars.length > max
		? `${chars.slice(0, max - 1).join("")}…`
		: chars.join("");
}

export function challengeTier(rank: number | undefined): number {
	if (!rank || !Number.isFinite(rank)) return 0;
	const tier = Math.floor(rank / 100);
	return tier >= 1 && tier <= 5 ? tier : 0;
}

type Parts = {
	name: string;
	rks: string | null;
	tier: number;
	level: number;
	fill: string;
	label: string;
};

function partsOf(input: BadgeInput, nameMax = NAME_MAX): Parts {
	const name = clipName(input.name, nameMax);
	const tier = challengeTier(input.challenge);
	const level = tier && input.challenge ? input.challenge % 100 : 0;
	const rks =
		typeof input.rks === "number" && Number.isFinite(input.rks)
			? input.rks.toFixed(4)
			: null;
	const value = `RKS ${rks ?? "—"}${tier ? ` · ${level}` : ""}`;
	return {
		name,
		rks,
		tier,
		level,
		fill: CHALLENGE_COLORS[tier] ?? "#6b7280",
		label: escapeXml(`${name}: ${value}`),
	};
}

function text(
	x: number,
	y: number,
	s: string,
	w: number,
	shadow: boolean,
	extra = "",
): string {
	const body = `textLength="${w}" lengthAdjust="spacingAndGlyphs"${extra}>${escapeXml(s)}</text>`;
	return shadow
		? `<text x="${x}" y="${y + 1}" fill="#010101" fill-opacity=".3" ${body}<text x="${x}" y="${y}" ${body}`
		: `<text x="${x}" y="${y}" ${body}`;
}

function pill(
	p: Parts,
	left: string,
	right: string,
	opts: {
		height: number;
		radius: number;
		gloss: boolean;
		size: number;
		pad: number;
		bold?: boolean;
	},
): string {
	const { height, radius, gloss, size, pad } = opts;
	const lw = left ? textWidth(left, size) + pad * 2 : 0;
	const rw = textWidth(right, size) + pad * 2;
	const width = lw + rw;
	const base = Math.round(height / 2 + size * 0.36);
	const weight = opts.bold ? ' font-weight="bold"' : "";
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${p.label}">`,
		`<title>${p.label}</title>`,
		`<defs>${gloss ? '<linearGradient id="gloss" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>' : ""}${RAINBOW}<clipPath id="r"><rect width="${width}" height="${height}" rx="${radius}"/></clipPath></defs>`,
		`<g clip-path="url(#r)">${lw ? `<rect width="${lw}" height="${height}" fill="#2b2d31"/>` : ""}<rect x="${lw}" width="${rw}" height="${height}" fill="${p.fill}"/>${gloss ? `<rect width="${width}" height="${height}" fill="url(#gloss)"/>` : ""}</g>`,
		`<g fill="#fff" font-family="${FONT}" font-size="${size}"${weight} text-rendering="geometricPrecision">`,
		left ? text(pad, base, left, lw - pad * 2, gloss) : "",
		text(lw + pad, base, right, rw - pad * 2, gloss),
		"</g></svg>",
	].join("");
}

function card(p: Parts, dark: boolean): string {
	const width = 300;
	const height = 72;
	const bg = dark ? "#16191f" : "#ffffff";
	const line = dark ? "#2c313a" : "#dfe3e8";
	const ink = dark ? "#f1f3f5" : "#14171c";
	const muted = dark ? "#9aa3ad" : "#5d6672";
	const nameW = Math.min(textWidth(p.name, 14), 196);
	const rks = p.rks ?? "—";
	const rksW = textWidth(rks, 22);
	const chip = p.tier ? `${p.level}` : "";
	const chipW = chip ? textWidth(chip, 12) + 18 : 0;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${p.label}">`,
		`<title>${p.label}</title>`,
		`<defs>${RAINBOW}</defs>`,
		`<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="10" fill="${bg}" stroke="${line}"/>`,
		`<rect x="0" y="10" width="4" height="${height - 20}" rx="2" fill="${p.fill}"/>`,
		`<g font-family="${FONT}" text-rendering="geometricPrecision">`,
		`<g fill="${ink}" font-size="14" font-weight="bold">${text(18, 26, p.name, nameW, false)}</g>`,
		`<g fill="${muted}" font-size="10" letter-spacing=".08em">${text(18, 56, "RKS", textWidth("RKS", 10), false)}</g>`,
		`<g fill="${ink}" font-size="22" font-weight="bold">${text(46, 57, rks, rksW, false)}</g>`,
		chip
			? `<rect x="${width - 16 - chipW}" y="14" width="${chipW}" height="20" rx="10" fill="${p.fill}"/><g fill="#fff" font-size="12" font-weight="bold">${text(width - 16 - chipW + 9, 28, chip, chipW - 18, false)}</g>`
			: "",
		`<g fill="${muted}" font-size="10">${text(width - 16 - textWidth("PhiBot", 10), 57, "PhiBot", textWidth("PhiBot", 10), false)}</g>`,
		"</g></svg>",
	].join("");
}

export function badgeSvg(
	input: BadgeInput,
	style: BadgeStyle = "flat",
): string {
	const p = partsOf(input, style.startsWith("card") ? 20 : NAME_MAX);
	const value = `RKS ${p.rks ?? "—"}${p.tier ? ` · ${p.level}` : ""}`;
	switch (style) {
		case "flat-square":
			return pill(p, p.name, value, {
				height: 20,
				radius: 0,
				gloss: false,
				size: 11,
				pad: 7,
			});
		case "for-the-badge":
			return pill(p, p.name.toUpperCase(), value.toUpperCase(), {
				height: 28,
				radius: 4,
				gloss: false,
				size: 11,
				pad: 12,
				bold: true,
			});
		case "rks":
			return pill(p, "", value, {
				height: 20,
				radius: 3,
				gloss: true,
				size: 11,
				pad: 7,
			});
		case "card":
			return card(p, false);
		case "card-dark":
			return card(p, true);
		default:
			return pill(p, p.name, value, {
				height: 20,
				radius: 3,
				gloss: true,
				size: 11,
				pad: 7,
			});
	}
}

export function badgeSnippets(
	origin: string,
	slug: string,
	style: BadgeStyle = "flat",
) {
	const query = style === "flat" ? "" : `?style=${style}`;
	const image = `${origin}/api/badge/${encodeURIComponent(slug)}${query}`;
	const page = `${origin}/p/${encodeURIComponent(slug)}`;
	return {
		image,
		markdown: `[![PhiBot RKS](${image})](${page})`,
		html: `<a href="${page}"><img alt="PhiBot RKS" src="${image}"></a>`,
	};
}
