import { artImports } from "@/server/render/art-runtime";
import { cardCopy } from "./card-i18n";
import { type LineSeg, percentLineChartSvg } from "./charts";
import { knobNum } from "./knobs";
import { fitEm, fitFontPx, splitTwoLines, textEm } from "./text-fit";
import type { CardData, VariantContext } from "./variants/types";

type Row = Record<string, unknown>;

function decodeHtmlText(raw: string) {
	return raw
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#(\d+);/g, (_n, d: string) => String.fromCharCode(Number(d)))
		.replace(/&#x([0-9a-f]+);/gi, (_n, h: string) =>
			String.fromCharCode(parseInt(h, 16)),
		);
}

function printed(value: unknown): string {
	return decodeHtmlText(artImports.$escape(value)).trim();
}

export function stripInlineFilters(html: string) {
	return html.replace(/\sstyle="([^"]*)"/gi, (_m, style: string) => {
		const next = style
			.replace(/filter\s*:[^;"]*;?/gi, "")
			.replace(/backdrop-filter\s*:[^;"]*;?/gi, "")
			.replace(/;{2,}/g, ";")
			.trim()
			.replace(/^;|;$/g, "");
		return next ? ` style="${next}"` : "";
	});
}

function richText(value: unknown): string {
	return stripInlineFilters(`${value}`)
		.replace(/\s*filter:\s*none;?/gi, "")
		.replace(/&ensp;/g, "&nbsp;");
}

function rows(value: unknown): (Row | null)[] {
	return Array.isArray(value) ? (value as (Row | null)[]) : [];
}

const PLAYER_BAR_W = 600;
const NAME_LEFT = PLAYER_BAR_W * (1 - 0.06 - 0.51);
const NAME_RIGHT = PLAYER_BAR_W * (1 - 0.06);
const NAME_BOX_H = 64;

function rksBoxRight(rks: string, sd: string) {
	const px = knobNum("--b30-rks-font-size", 20.8);
	const text =
		textEm(decodeHtmlText(rks)) * px + textEm(decodeHtmlText(sd)) * px * 0.72;
	return (
		knobNum("--b30-rks-left", 153) +
		knobNum("--b30-rks-pad-left", 15) +
		text +
		knobNum("--b30-rks-pad-right", 11)
	);
}

function nameStyle(name: string, rks: string, sd: string): string {
	const left = Math.max(
		NAME_LEFT,
		rksBoxRight(rks, sd) + knobNum("--b30-name-gap", 12),
	);
	const maxPx = knobNum("--b30-name-font-size", 32);
	const lines = name
		.split(/<br\s*\/?>/i)
		.map((line) => decodeHtmlText(line.replace(/<[^>]*>/g, "")).trim());
	const em = Math.max(...lines.map(textEm)) * (/<b>/i.test(name) ? 1.06 : 1);
	const centre = (NAME_LEFT + NAME_RIGHT) / 2;
	const centred = 2 * Math.min(centre - left, NAME_RIGHT - centre);
	const tallPx = NAME_BOX_H / (lines.length * 1.3);
	if (em * maxPx <= centred && maxPx <= tallPx) return "";
	const px = Math.min(fitEm(em, NAME_RIGHT - left - 2, maxPx), tallPx);
	const shift = Math.round(left - NAME_LEFT);
	return `font-size:${px.toFixed(1)}px;padding-left:${shift}px`;
}

function titleFitter() {
	const maxPx = knobNum("--b30-songname-font-size", 15);
	const minPx = knobNum("--b30-songname-min-font-size", 8);
	const wrapPx = knobNum("--b30-songname-wrap-font-size", 11);
	const width = knobNum("--b30-songname-fit-width", 150);
	return (title: unknown): { px: number; lines?: string[] } => {
		const name = printed(title);
		const px = fitFontPx(name, width, maxPx);
		if (px >= minPx) return { px };
		const lines = splitTwoLines(name).filter(Boolean);
		return {
			px: Math.min(...lines.map((line) => fitFontPx(line, width, wrapPx))),
			lines,
		};
	};
}

const RANK_BADGES_W = 305;
const RANK_BAND_W = 156;
const RANK_BADGE = { pad: 23, bandPad: 25, next: 6, tag: 5, of: 4, pct: 9 };
type RankBadgeText = {
	band: boolean;
	tag: string;
	pos: string;
	of: string;
	pct: string;
};

function rankBadgeW(b: RankBadgeText, px: number, withOf: boolean) {
	return (
		(b.band ? RANK_BADGE.bandPad : RANK_BADGE.pad) +
		(b.tag ? textEm(b.tag) * px + RANK_BADGE.tag : 0) +
		textEm(b.pos) * px * 1.1 +
		(withOf && b.of ? RANK_BADGE.of + textEm(b.of) * px : 0) +
		(b.pct ? (b.pos ? RANK_BADGE.pct : 0) + textEm(b.pct) * px : 0)
	);
}

const RANK_FITS = [
	{ px: 12, of: true },
	{ px: 11, of: true },
	{ px: 11, of: false },
	{ px: 10, of: false },
] as const;
type RankFit = (typeof RANK_FITS)[number];

function fitBadge(b: RankBadgeText, widthPx: number, maxPx = 12): RankFit {
	const steps = RANK_FITS.filter((f) => f.px <= maxPx);
	return (
		steps.find((f) => rankBadgeW(b, f.px, f.of) <= widthPx) ??
		RANK_FITS[RANK_FITS.length - 1]!
	);
}

function fitRanks(ranks: Row[]): Row[] {
	const badges: RankBadgeText[] = ranks.map((r) => {
		const places = r.show !== "percent";
		return {
			band: r.scope === "band",
			tag: r.tag ? printed(r.tag) : "",
			pos: places ? printed(r.pos) : "",
			of: places ? printed(r.of) : "",
			pct: places && r.show !== "place" ? printed(r.pct) : "",
		};
	});
	const band = badges.find((b) => b.band);
	const bandFit = band ? fitBadge(band, RANK_BAND_W) : undefined;
	const left =
		RANK_BADGES_W -
		(band && bandFit
			? rankBadgeW(band, bandFit.px, bandFit.of) + RANK_BADGE.next
			: 0);
	const fits = badges.map((b) =>
		b.band && bandFit ? bandFit : fitBadge(b, left, bandFit?.px),
	);
	return ranks.map((r, i) => ({ ...r, fit: fits[i] }));
}

const STD_RANKS = new Set(["AT", "IN", "HD", "EZ"]);

function songRows(list: unknown, fitTitle: ReturnType<typeof titleFitter>) {
	return rows(list).map((song) => {
		if (!song) return song;
		const ranks = rows(song.accRanks) as Row[];
		return {
			...song,
			fit: {
				...fitTitle(song.song),
				mid: STD_RANKS.has(artImports.$escape(song.rank)),
			},
			accRanks: ranks.length ? fitRanks(ranks) : song.accRanks,
		};
	});
}

function statCells(stats: Row[]) {
	const cell = (value: unknown) => {
		const text = artImports.$escape(value).replace(/&amp;/g, "&").trim();
		return text === "\\" || text === "/" || text === "\\\\" || !text
			? "&nbsp;"
			: text;
	};
	return [
		["&nbsp;", ...stats.map((s) => cell(s.title))],
		[cell("C"), ...stats.map((s) => cell(s.cleared))],
		[cell("FC"), ...stats.map((s) => cell(s.fc))],
		[cell("Phi"), ...stats.map((s) => cell(s.phi))],
	];
}

const PLOT_H = 136;

function plotPx(percent: unknown) {
	return Math.round((Number(percent) / 100) * PLOT_H);
}

function histogramView(raw: unknown, yTitle: string) {
	const h = (raw ?? {}) as Row;
	const title = artImports.$escape(yTitle);
	const words = title.trim().split(/\s+/);
	return {
		yTitle:
			words.length >= 2
				? [words.slice(0, -1).join(" "), words[words.length - 1]]
				: [title],
		avgBottom: plotPx(h.averagePosition),
		ticks: rows(h.ticks).map((tick) => ({
			label: tick?.label,
			bottom: plotPx(tick?.position),
		})),
		slots: rows(h.slots).map((slot) => {
			const label = artImports.$escape(slot?.label);
			const stacked = /^(P|B)(\d+)$/i.exec(label.trim());
			return {
				bar: slot?.kind === "phi" ? "phi-bar" : "best-bar",
				height: Math.max(3, plotPx(slot?.height)),
				label: stacked ? [stacked[1], stacked[2]] : [label],
			};
		}),
	};
}

function prepareB19(data: CardData, ctx: VariantContext): CardData {
	const user = (data.gameuser ?? {}) as Row;
	const name = richText(user.PlayerId);
	const sd = Number(data.rksStddev) > 0;
	const stats = rows(data.stats).filter((s): s is Row => Boolean(s));
	const labW = Math.round(knobNum("--b30-stats-lab-width", 48));
	const valW = Math.round(knobNum("--b30-stats-val-width", 48));
	const fitTitle = titleFitter();
	const analysis = data.b30Analysis as Row | undefined;
	return {
		...data,
		gameuser: { ...user, PlayerId: name },
		nameStyle: nameStyle(
			name,
			`${artImports.$escape((user.rks as number).toFixed(4))}${sd ? " " : ""}`,
			sd ? `±${(data.rksStddev as number).toFixed(2)}` : "",
		),
		statsTable: {
			labW,
			valW,
			width: labW + valW * 4,
			rows: statCells(stats),
		},
		phi: data.phi ? songRows(data.phi, fitTitle) : data.phi,
		b19_list: songRows(data.b19_list, fitTitle),
		b30Analysis: analysis && {
			...analysis,
			radarHtml: richText(analysis.radarHtml),
		},
		hist: analysis
			? histogramView(analysis.histogram, cardCopy(ctx.locale).histY)
			: undefined,
	};
}

function updateTitlePx(title: unknown) {
	let units = 0;
	for (const ch of printed(title)) units += ch.charCodeAt(0) <= 0xff ? 0.52 : 1;
	return Math.min(10, Math.max(8, Math.floor(108 / Math.max(units, 1))));
}

function rksLine(history: unknown): string {
	const plain = (v: unknown) => /^[\d.]+$/.test(artImports.$escape(v));
	const segs = (Array.isArray(history) ? history : [])
		.filter(
			(seg): seg is unknown[] =>
				Array.isArray(seg) && [0, 1, 2, 3].every((i) => plain(seg[i])),
		)
		.map((seg) => seg.slice(0, 4).map(Number) as LineSeg);
	return segs.length ? percentLineChartSvg(segs) : "";
}

function prepareUpdate(data: CardData): CardData {
	const titled = (song: Row | null) =>
		song
			? {
					...song,
					titlePx: updateTitlePx(song.song),
					accText: Number(song.acc_new).toFixed(4),
				}
			: song;
	return {
		...data,
		PlayerId: richText(data.PlayerId),
		rksLine: rksLine(data.rks_history),
		task_data: Array.isArray(data.task_data)
			? rows(data.task_data).map(titled)
			: data.task_data,
		box_line: rows(data.box_line as unknown[]).map((line) =>
			rows(line).map((date) =>
				date ? { ...date, song: rows(date.song).map(titled) } : date,
			),
		),
	};
}

const CLASSIC: Record<
	string,
	(data: CardData, ctx: VariantContext) => CardData
> = {
	b19: prepareB19,
	update: prepareUpdate,
};

export function classicPrepare(tpl: string) {
	return CLASSIC[tpl];
}
