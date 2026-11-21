import { escapeHtml } from "@/phi/lib/html";
import { clipEm, textEm } from "@/phi/lib/text-fit";

export const SNAP_PROGRESS = "snap/progress";
export const SNAP_TARGETS = "snap/targets";
export const SNAP_WRAPPED = "snap/wrapped";
export const SNAP_TYPE = "snap/type";
export const SNAP_SUITS = "snap/suits";
export const SNAP_ACHIEVEMENTS = "snap/achievements";
export const SNAP_W = 1200;

const LEVEL_COLOR: Record<string, string> = {
	EZ: "#1f7a3a",
	HD: "#1d6798",
	IN: "#c0392f",
	AT: "#4a505d",
};

type SnapHead = {
	brand: string;
	host: string;
	title: string;
	player: string;
	meta: string;
	accent: string;
	lang?: string;
};

export type SnapCell = { clear: number; fc: number; ap: number; total: number };

export type ProgressSnap = SnapHead & {
	levels: string[];
	rows: { bucket: string; cells: (SnapCell | null)[] }[];
	totals: (SnapCell | null)[];
	labels: {
		constant: string;
		total: string;
		fc: string;
		ap: string;
		legend: string;
	};
};

export type TargetsSnap = SnapHead & {
	rows: {
		title: string;
		rank: string;
		c: string;
		acc: string;
		need: string;
		jacket?: string;
	}[];
	labels: {
		song: string;
		constant: string;
		acc: string;
		target: string;
		empty: string;
	};
};

const PAD = 56;
const HEAD_H = 152;
const FOOT_H = 72;
const ROW_H = 46;
const TARGET_H = 74;

const BASE = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${SNAP_W}px; background: #0b0d14; color: #f4f6fc; font-family: NotoSansSC, PHI, sans-serif; }
.snap { position: relative; width: ${SNAP_W}px; display: flex; flex-direction: column; padding: ${PAD}px ${PAD}px 0; background: linear-gradient(160deg, #11152a 0%, #0b0d14 55%); }
.brand { display: flex; align-items: center; font-family: Aldrich, NotoSansSC, sans-serif; font-size: 24px; letter-spacing: 4px; color: #e6eaf5; }
.bar { width: 10px; height: 28px; margin-right: 16px; border-radius: 2px; transform: skewX(-14deg); }
.title { margin-top: 18px; font-size: 52px; font-weight: 700; line-height: 1.1; }
.who { display: flex; align-items: baseline; margin-top: 12px; font-size: 26px; color: #c3cadf; }
.who-name { font-weight: 700; color: #f4f6fc; margin-right: 18px; }
.foot { display: flex; justify-content: space-between; align-items: center; height: ${FOOT_H}px; font-family: Aldrich, NotoSansSC, sans-serif; font-size: 20px; color: #8790ab; }
.chip { display: flex; align-items: center; justify-content: center; min-width: 52px; height: 30px; padding: 0 10px; border-radius: 6px; font-size: 18px; font-weight: 700; color: #ffffff; }
`;

const PROGRESS_CSS = `
.grid { display: flex; flex-direction: column; margin-top: 28px; border: 1px solid #262c45; border-radius: 12px; overflow: hidden; }
.row { display: flex; height: ${ROW_H}px; border-top: 1px solid #1d2238; }
.row:first-child { border-top: 0; }
.row-head { background: #141a31; }
.row-total { background: #141a31; height: ${ROW_H + 6}px; }
.k { width: 132px; display: flex; align-items: center; padding-left: 20px; font-size: 20px; color: #aab2cc; font-weight: 700; }
.cell { position: relative; flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-left: 1px solid #1d2238; }
.fill { position: absolute; left: 0; top: 0; bottom: 0; opacity: 0.38; }
.n { position: relative; font-size: 21px; font-weight: 700; color: #f4f6fc; }
.of { color: #8790ab; font-weight: 400; }
.sub { position: relative; font-size: 15px; color: #c3cadf; }
.empty { color: #3a4160; font-size: 20px; }
.legend { margin-top: 14px; font-size: 17px; color: #8790ab; }
`;

const TARGETS_CSS = `
.list { display: flex; flex-direction: column; margin-top: 28px; }
.t-head { display: flex; height: 36px; align-items: center; font-size: 17px; color: #8790ab; font-weight: 700; border-bottom: 1px solid #262c45; }
.t-row { display: flex; height: ${TARGET_H}px; align-items: center; border-bottom: 1px solid #1d2238; }
.jacket { width: 102px; height: 54px; border-radius: 6px; object-fit: cover; margin-right: 18px; background: #1b2036; }
.song { flex: 1; display: flex; align-items: center; min-width: 0; }
.song-name { font-size: 24px; font-weight: 700; margin-left: 14px; }
.num { width: 150px; text-align: right; font-size: 23px; display: flex; justify-content: flex-end; }
.need { color: #8be3ff; font-weight: 700; }
.muted { color: #aab2cc; }
.none { margin-top: 40px; font-size: 26px; color: #c3cadf; }
`;

function head(d: SnapHead): string {
	return `<div class="brand"><div class="bar" style="background:${escapeHtml(d.accent)}"></div>${escapeHtml(d.brand)}</div><div class="title">${escapeHtml(d.title)}</div><div class="who"><span class="who-name">${escapeHtml(d.player)}</span><span>${escapeHtml(d.meta)}</span></div>`;
}

function foot(d: SnapHead): string {
	return `<div class="foot"><span>${escapeHtml(d.host)}</span></div>`;
}

const page = (css: string, body: string, lang?: string) =>
	`<!doctype html>${lang ? `<html lang="${escapeHtml(lang)}">` : "<html>"}<head><meta charset="utf-8"><style>${BASE}${css}</style></head><body><div class="snap">${body}</div></body></html>`;

function cellHtml(
	cell: SnapCell | null,
	level: string,
	d: ProgressSnap,
): string {
	if (!cell) return `<div class="cell"><span class="empty">·</span></div>`;
	const pct = cell.total
		? Math.round((cell.clear / cell.total) * 1000) / 10
		: 0;
	return `<div class="cell"><div class="fill" style="width:${pct}%;background:${LEVEL_COLOR[level] ?? "#4a505d"}"></div><span class="n">${cell.clear}<span class="of">/${cell.total}</span></span><span class="sub">${escapeHtml(d.labels.fc)} ${cell.fc} · ${escapeHtml(d.labels.ap)} ${cell.ap}</span></div>`;
}

export function progressSnapHeight(d: Pick<ProgressSnap, "rows">): number {
	return PAD + HEAD_H + 28 + (d.rows.length + 2) * ROW_H + 8 + 40 + FOOT_H;
}

export function progressSnapHtml(d: ProgressSnap): string {
	const levelHead = d.levels
		.map(
			(l) =>
				`<div class="cell"><span class="chip" style="background:${LEVEL_COLOR[l] ?? "#4a505d"}">${escapeHtml(l)}</span></div>`,
		)
		.join("");
	const rows = d.rows
		.map(
			(r) =>
				`<div class="row"><div class="k">${escapeHtml(r.bucket)}</div>${r.cells
					.map((c, i) => cellHtml(c, d.levels[i] ?? "", d))
					.join("")}</div>`,
		)
		.join("");
	const totals = `<div class="row row-total"><div class="k">${escapeHtml(d.labels.total)}</div>${d.totals
		.map((c, i) => cellHtml(c, d.levels[i] ?? "", d))
		.join("")}</div>`;
	return page(
		PROGRESS_CSS,
		`${head(d)}<div class="grid"><div class="row row-head"><div class="k">${escapeHtml(d.labels.constant)}</div>${levelHead}</div>${rows}${totals}</div><div class="legend">${escapeHtml(d.labels.legend)}</div>${foot(d)}`,
		d.lang,
	);
}

export function targetsSnapHeight(d: Pick<TargetsSnap, "rows">): number {
	return (
		PAD + HEAD_H + 28 + 36 + Math.max(1, d.rows.length) * TARGET_H + 24 + FOOT_H
	);
}

export function targetsSnapHtml(d: TargetsSnap): string {
	const rows = d.rows
		.map((r) => {
			const name = clipEm(r.title, 22);
			const title = name.cut ? `${name.text.trimEnd()}…` : name.text;
			const jacket = r.jacket
				? `<img class="jacket" src="${escapeHtml(r.jacket)}" alt="">`
				: `<div class="jacket"></div>`;
			return `<div class="t-row">${jacket}<div class="song"><span class="chip" style="background:${LEVEL_COLOR[r.rank] ?? "#4a505d"}">${escapeHtml(r.rank)}</span><span class="song-name">${escapeHtml(title)}</span></div><div class="num muted">${escapeHtml(r.c)}</div><div class="num muted">${escapeHtml(r.acc)}</div><div class="num need">${escapeHtml(r.need)}</div></div>`;
		})
		.join("");
	const list = d.rows.length
		? `<div class="list"><div class="t-head"><span style="flex:1;padding-left:120px">${escapeHtml(d.labels.song)}</span><span class="num">${escapeHtml(d.labels.constant)}</span><span class="num">${escapeHtml(d.labels.acc)}</span><span class="num">${escapeHtml(d.labels.target)}</span></div>${rows}</div>`
		: `<div class="none">${escapeHtml(d.labels.empty)}</div>`;
	return page(
		TARGETS_CSS,
		`${head(d)}${list}<div style="height:24px"></div>${foot(d)}`,
		d.lang,
	);
}

export type WrappedSnap = SnapHead & {
	range: string;
	tiles: { label: string; value: string; sub: string }[];
	message: string;
	note: string;
	pgti?: {
		label: string;
		letters: string[];
		suffix?: string;
		name: string;
		groups: string;
	};
};

const TILE_H = 150;
const TILE_GAP = 20;
const TYPE_H = 172;

const WRAPPED_CSS = `
.range { margin-top: 10px; font-size: 20px; color: #8790ab; }
.tiles { display: flex; flex-wrap: wrap; justify-content: space-between; margin-top: 28px; }
.tile { width: 534px; height: ${TILE_H}px; margin-bottom: ${TILE_GAP}px; display: flex; flex-direction: column; justify-content: center; padding: 0 28px; border: 1px solid #262c45; border-radius: 12px; background: #141a31; }
.tile-label { font-size: 19px; font-weight: 700; color: #8790ab; }
.tile-value { margin-top: 8px; font-size: 38px; font-weight: 700; color: #f4f6fc; white-space: nowrap; overflow: hidden; }
.tile-sub { margin-top: 6px; font-size: 19px; color: #c3cadf; white-space: nowrap; overflow: hidden; }
.pgti { display: flex; align-items: center; height: ${TYPE_H}px; margin-bottom: ${TILE_GAP}px; padding: 0 28px; border: 1px solid #262c45; border-radius: 12px; background: #141a31; }
.pgti-code { display: flex; align-items: center; margin-right: 32px; }
.pgti-l { display: flex; align-items: center; justify-content: center; width: 76px; height: 104px; margin-right: 10px; border-radius: 10px; background: #f4f6fc; color: #0b0d14; font-family: Aldrich, NotoSansSC, sans-serif; font-size: 58px; font-weight: 700; }
.pgti-dash { width: 18px; height: 6px; margin-right: 10px; border-radius: 3px; background: #8790ab; }
.pgti-s { width: 60px; height: 84px; background: #8be3ff; font-size: 44px; }
.pgti-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.pgti-label { font-size: 19px; font-weight: 700; color: #8790ab; }
.pgti-name { margin-top: 6px; font-size: 40px; font-weight: 700; color: #f4f6fc; white-space: nowrap; overflow: hidden; }
.pgti-groups { margin-top: 6px; font-size: 22px; color: #c3cadf; white-space: nowrap; overflow: hidden; }
.message { margin-top: 40px; font-size: 26px; line-height: 1.5; color: #c3cadf; }
.note { margin-top: 8px; font-size: 17px; line-height: 1.5; color: #8790ab; }
`;

export function wrappedSnapHeight(
	d: Pick<WrappedSnap, "tiles">,
	typed = false,
): number {
	const rows = Math.ceil(d.tiles.length / 2);
	const type = rows && typed ? TYPE_H + TILE_GAP : 0;
	const body = rows ? 28 + rows * (TILE_H + TILE_GAP) + type : 200;
	return PAD + HEAD_H + 40 + body + 100 + FOOT_H;
}

function clipped(text: string, em: number): string {
	const whole = clipEm(text, em);
	if (!whole.cut) return whole.text;
	return `${clipEm(text, em - textEm("…")).text.trimEnd()}…`;
}

export function wrappedSnapHtml(d: WrappedSnap): string {
	const tiles = d.tiles
		.map(
			(tile) =>
				`<div class="tile"><div class="tile-label">${escapeHtml(tile.label)}</div><div class="tile-value">${escapeHtml(clipped(tile.value, 12))}</div><div class="tile-sub">${escapeHtml(clipped(tile.sub, 24))}</div></div>`,
		)
		.join("");
	const p = d.pgti;
	const type = p
		? `<div class="pgti"><div class="pgti-code">${p.letters.map((letter) => `<div class="pgti-l">${escapeHtml(letter)}</div>`).join("")}${p.suffix ? `<div class="pgti-dash"></div><div class="pgti-l pgti-s">${escapeHtml(p.suffix)}</div>` : ""}</div><div class="pgti-text"><div class="pgti-label">${escapeHtml(p.label)}</div><div class="pgti-name">${escapeHtml(clipped(p.name, 13))}</div><div class="pgti-groups">${escapeHtml(clipped(p.groups, 24))}</div></div></div>`
		: "";
	const body = d.tiles.length
		? `<div class="tiles">${tiles}</div>${type}`
		: `<div class="message">${escapeHtml(d.message)}</div>`;
	return page(
		WRAPPED_CSS,
		`${head({ ...d, player: clipped(d.player, 24) })}<div class="range">${escapeHtml(d.range)}</div>${body}<div class="note">${escapeHtml(d.note)}</div>${foot(d)}`,
		d.lang,
	);
}

const HEAD_FIT = `.who { height: 38px; line-height: 38px; }`;
const FIT_SLACK = 4;

export type TypeSnap = SnapHead & {
	range: string;
	letters: { letter: string; pole: string }[];
	drive?: { letter: string; pole: string };
	name: string;
	groups: { label: string; name: string; line: string }[];
	axes: { letter: string; label: string; trait: string; fact: string }[];
	note: string;
};

const TY_CODE_H = 250;
const TY_AXIS_H = 92;

const TYPE_CSS = `${HEAD_FIT}
.range { margin-top: 10px; height: 28px; font-size: 20px; color: #8790ab; white-space: nowrap; overflow: hidden; }
.ty-code { display: flex; justify-content: center; align-items: center; height: ${TY_CODE_H}px; margin-top: 36px; }
.ty-l { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 200px; height: ${TY_CODE_H}px; border-radius: 18px; background: #f4f6fc; color: #0b0d14; }
.ty-gap { margin-left: 16px; }
.ty-glyph { display: flex; align-items: center; justify-content: center; height: 160px; font-family: Aldrich, NotoSansSC, sans-serif; font-size: 150px; font-weight: 700; line-height: 1; }
.ty-pole { display: flex; justify-content: center; width: 176px; height: 32px; margin-top: 10px; font-size: 22px; font-weight: 700; color: #4a505d; white-space: nowrap; overflow: hidden; }
.ty-dash { width: 22px; height: 8px; margin: 0 16px; border-radius: 4px; background: #8790ab; }
.ty-s { width: 140px; height: 180px; background: #8be3ff; }
.ty-glyph-s { height: 112px; font-size: 104px; }
.ty-pole-s { width: 124px; height: 26px; margin-top: 6px; font-size: 18px; }
.ty-name { display: flex; justify-content: center; height: 74px; margin-top: 34px; font-size: 64px; font-weight: 700; line-height: 1.15; white-space: nowrap; overflow: hidden; }
.ty-groups { display: flex; justify-content: space-between; margin-top: 30px; }
.ty-group { display: flex; flex-direction: column; justify-content: center; width: 534px; height: 124px; padding: 0 28px; border: 1px solid #262c45; border-radius: 12px; background: #141a31; }
.ty-group-label { font-size: 18px; font-weight: 700; color: #8790ab; white-space: nowrap; overflow: hidden; }
.ty-group-name { margin-top: 2px; font-size: 30px; font-weight: 700; line-height: 1.3; white-space: nowrap; overflow: hidden; }
.ty-group-line { margin-top: 2px; font-size: 19px; color: #c3cadf; white-space: nowrap; overflow: hidden; }
.ty-axes { display: flex; flex-direction: column; margin-top: 24px; border-top: 1px solid #262c45; }
.ty-axis { display: flex; align-items: center; height: ${TY_AXIS_H}px; border-bottom: 1px solid #1d2238; }
.ty-chip { display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; margin-right: 22px; border-radius: 10px; background: #1b2240; color: #8be3ff; font-family: Aldrich, NotoSansSC, sans-serif; font-size: 32px; font-weight: 700; }
.ty-axis-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.ty-axis-label { font-size: 16px; font-weight: 700; line-height: 1.3; color: #8790ab; white-space: nowrap; overflow: hidden; }
.ty-trait { margin-top: 2px; font-size: 22px; line-height: 1.3; color: #f4f6fc; white-space: nowrap; overflow: hidden; }
.ty-fact { margin-top: 2px; font-size: 17px; line-height: 1.3; color: #aab2cc; white-space: nowrap; overflow: hidden; }
.ty-note { height: 26px; margin-top: 20px; font-size: 17px; color: #8790ab; white-space: nowrap; overflow: hidden; }
`;

export function typeSnapHeight(d: Pick<TypeSnap, "axes">): number {
	return (
		PAD +
		HEAD_H +
		FIT_SLACK +
		38 +
		36 +
		TY_CODE_H +
		34 +
		74 +
		30 +
		124 +
		24 +
		1 +
		d.axes.length * TY_AXIS_H +
		20 +
		26 +
		28 +
		FOOT_H
	);
}

export function typeSnapHtml(d: TypeSnap): string {
	const letters = d.letters
		.map(
			(l, i) =>
				`<div class="ty-l${i ? " ty-gap" : ""}"><div class="ty-glyph">${escapeHtml(l.letter)}</div><div class="ty-pole">${escapeHtml(clipped(l.pole, 7.8))}</div></div>`,
		)
		.join("");
	const drive = d.drive
		? `<div class="ty-dash"></div><div class="ty-l ty-s"><div class="ty-glyph ty-glyph-s">${escapeHtml(d.drive.letter)}</div><div class="ty-pole ty-pole-s">${escapeHtml(clipped(d.drive.pole, 6.6))}</div></div>`
		: "";
	const groups = d.groups
		.map(
			(g) =>
				`<div class="ty-group"><div class="ty-group-label">${escapeHtml(clipped(g.label, 26))}</div><div class="ty-group-name">${escapeHtml(clipped(g.name, 15.5))}</div><div class="ty-group-line">${escapeHtml(clipped(g.line, 24.5))}</div></div>`,
		)
		.join("");
	const axes = d.axes
		.map(
			(a) =>
				`<div class="ty-axis"><div class="ty-chip">${escapeHtml(a.letter)}</div><div class="ty-axis-text"><div class="ty-axis-label">${escapeHtml(clipped(a.label, 60))}</div><div class="ty-trait">${escapeHtml(clipped(a.trait, 45))}</div><div class="ty-fact">${escapeHtml(clipped(a.fact, 58))}</div></div></div>`,
		)
		.join("");
	return page(
		TYPE_CSS,
		`${head({ ...d, player: clipped(d.player, 24) })}<div class="range">${escapeHtml(clipped(d.range, 53))}</div><div class="ty-code">${letters}${drive}</div><div class="ty-name">${escapeHtml(clipped(d.name, 16.5))}</div><div class="ty-groups">${groups}</div><div class="ty-axes">${axes}</div><div class="ty-note">${escapeHtml(clipped(d.note, 62))}</div><div style="height:28px"></div>${foot(d)}`,
		d.lang,
	);
}

export type SuitsTile = {
	title: string;
	rank: string;
	c: string;
	acc: string;
	jacket?: string;
};

export type SuitsSnap = SnapHead & {
	level: number;
	count: string;
	tiers: { tier: string; label: string; tiles: SuitsTile[] }[];
	none: string;
};

export const SUITS_PER_LINE = 6;
const SUITS_TILE_H = 116;
const SUITS_LINE_GAP = 12;
const SUITS_EMPTY_H = 52;
const SUITS_ROW_PAD = 14;
const SUITS_ROW_GAP = 14;

const TIER_COLOR: Record<string, string> = {
	great: "#8be3ff",
	good: "#5fb3d9",
	even: "#aab2cc",
	hard: "#e08a7e",
	wall: "#ef5a4c",
};

const SUITS_CSS = `${HEAD_FIT}
.count { margin-top: 10px; height: 28px; font-size: 20px; color: #8790ab; white-space: nowrap; overflow: hidden; }
.dt { display: flex; flex-direction: column; margin-top: 28px; }
.dt-row { display: flex; margin-bottom: ${SUITS_ROW_GAP}px; border: 1px solid #262c45; border-radius: 12px; background: #141a31; overflow: hidden; }
.dt-bar { width: 6px; }
.dt-label { display: flex; flex-direction: column; width: 172px; padding: ${SUITS_ROW_PAD}px 12px 0 18px; }
.dt-name { font-size: 19px; font-weight: 700; line-height: 1.3; overflow: hidden; }
.dt-lines { display: flex; flex-direction: column; padding-top: ${SUITS_ROW_PAD}px; }
.dt-line { display: flex; height: ${SUITS_TILE_H}px; }
.dt-line-gap { margin-top: ${SUITS_LINE_GAP}px; }
.dt-tile { display: flex; flex-direction: column; width: 138px; height: ${SUITS_TILE_H}px; }
.dt-tile-gap { margin-left: 12px; }
.dt-jacket { width: 138px; height: 73px; border-radius: 6px; object-fit: cover; background: #1b2036; }
.dt-title { height: 19px; margin-top: 6px; font-size: 14px; line-height: 19px; font-weight: 700; color: #f4f6fc; white-space: nowrap; overflow: hidden; }
.dt-meta { display: flex; justify-content: space-between; align-items: center; height: 17px; margin-top: 1px; font-size: 12px; line-height: 17px; color: #aab2cc; white-space: nowrap; overflow: hidden; }
.dt-c { display: flex; align-items: center; }
.dt-rank { display: flex; align-items: center; height: 15px; margin-right: 5px; padding: 0 4px; border-radius: 3px; font-size: 11px; font-weight: 700; color: #ffffff; }
.dt-none { display: flex; height: ${SUITS_EMPTY_H}px; font-size: 19px; line-height: 1.3; color: #6c7493; }
`;

function suitsRowHeight(tiles: number): number {
	const lines = Math.ceil(tiles / SUITS_PER_LINE);
	const inner = lines
		? lines * SUITS_TILE_H + (lines - 1) * SUITS_LINE_GAP
		: SUITS_EMPTY_H;
	return inner + 2 * SUITS_ROW_PAD + 2;
}

export function suitsSnapHeight(d: Pick<SuitsSnap, "tiers">): number {
	const rows = d.tiers.reduce(
		(sum, tier) => sum + suitsRowHeight(tier.tiles.length) + SUITS_ROW_GAP,
		0,
	);
	return PAD + HEAD_H + FIT_SLACK + 38 + 28 + rows + 10 + FOOT_H;
}

function suitsTile(t: SuitsTile, gap: boolean): string {
	const jacket = t.jacket
		? `<img class="dt-jacket" src="${escapeHtml(t.jacket)}" alt="">`
		: `<div class="dt-jacket"></div>`;
	return `<div class="dt-tile${gap ? " dt-tile-gap" : ""}">${jacket}<div class="dt-title">${escapeHtml(clipped(t.title, 9.6))}</div><div class="dt-meta"><span class="dt-c"><span class="dt-rank" style="background:${LEVEL_COLOR[t.rank] ?? "#4a505d"}">${escapeHtml(t.rank)}</span>${escapeHtml(t.c)}</span><span>${escapeHtml(t.acc)}</span></div></div>`;
}

export function suitsSnapHtml(d: SuitsSnap): string {
	const rows = d.tiers
		.map((tier) => {
			const color = TIER_COLOR[tier.tier] ?? "#aab2cc";
			const lines: string[] = [];
			for (let i = 0; i < tier.tiles.length; i += SUITS_PER_LINE) {
				const line = tier.tiles
					.slice(i, i + SUITS_PER_LINE)
					.map((t, j) => suitsTile(t, j > 0))
					.join("");
				lines.push(
					`<div class="dt-line${i ? " dt-line-gap" : ""}">${line}</div>`,
				);
			}
			const body = lines.length
				? lines.join("")
				: `<div class="dt-none">${escapeHtml(d.none)}</div>`;
			return `<div class="dt-row" style="height:${suitsRowHeight(tier.tiles.length)}px"><div class="dt-bar" style="background:${color}"></div><div class="dt-label"><div class="dt-name" style="color:${color}">${escapeHtml(tier.label)}</div></div><div class="dt-lines">${body}</div></div>`;
		})
		.join("");
	return page(
		SUITS_CSS,
		`${head({ ...d, player: clipped(d.player, 24) })}<div class="count">${escapeHtml(d.count)}</div><div class="dt">${rows}</div><div style="height:10px"></div>${foot(d)}`,
		d.lang,
	);
}

export type AchievementsSnap = SnapHead & {
	items: {
		name: string;
		line: string;
		state: string;
		steps: string;
		share: number;
		complete: boolean;
	}[];
};

const AB_H = 132;
const AB_GAP = 14;

const ACHIEVEMENTS_CSS = `${HEAD_FIT}
.ab { display: flex; flex-direction: column; margin-top: 28px; }
.ab-row { display: flex; justify-content: space-between; height: ${AB_H}px; margin-bottom: ${AB_GAP}px; }
.ab-card { display: flex; flex-direction: column; width: 534px; height: ${AB_H}px; padding: 16px 24px 0; border: 1px solid #262c45; border-radius: 12px; background: #141a31; }
.ab-done { border-color: #4fc3f7; }
.ab-blank { width: 534px; }
.ab-top { display: flex; justify-content: space-between; align-items: center; height: 28px; }
.ab-name { font-size: 21px; font-weight: 700; white-space: nowrap; overflow: hidden; }
.ab-steps { font-size: 15px; color: #8790ab; white-space: nowrap; overflow: hidden; }
.ab-line { height: 21px; font-size: 15px; line-height: 21px; color: #8790ab; white-space: nowrap; overflow: hidden; }
.ab-state { height: 27px; margin-top: 6px; font-size: 19px; line-height: 27px; color: #f4f6fc; white-space: nowrap; overflow: hidden; }
.ab-track { display: flex; height: 8px; margin-top: 10px; border-radius: 4px; background: #262c45; overflow: hidden; }
.ab-fill { height: 8px; border-radius: 4px; background: #4fc3f7; }
`;

export function achievementsSnapHeight(
	d: Pick<AchievementsSnap, "items">,
): number {
	const rows = Math.ceil(d.items.length / 2);
	return PAD + HEAD_H + FIT_SLACK + 28 + rows * (AB_H + AB_GAP) + 8 + FOOT_H;
}

function achievementCard(item: AchievementsSnap["items"][number]): string {
	const pct = Math.round(Math.min(1, Math.max(0, item.share)) * 1000) / 10;
	return `<div class="ab-card${item.complete ? " ab-done" : ""}"><div class="ab-top"><span class="ab-name">${escapeHtml(clipped(item.name, 15.5))}</span><span class="ab-steps">${escapeHtml(clipped(item.steps, 9))}</span></div><div class="ab-line">${escapeHtml(clipped(item.line, 31.5))}</div><div class="ab-state">${escapeHtml(clipped(item.state, 25))}</div><div class="ab-track"><div class="ab-fill" style="width:${pct}%"></div></div></div>`;
}

export function achievementsSnapHtml(d: AchievementsSnap): string {
	const rows: string[] = [];
	for (let i = 0; i < d.items.length; i += 2) {
		const [left, right] = [d.items[i], d.items[i + 1]];
		rows.push(
			`<div class="ab-row">${left ? achievementCard(left) : ""}${right ? achievementCard(right) : `<div class="ab-blank"></div>`}</div>`,
		);
	}
	return page(
		ACHIEVEMENTS_CSS,
		`${head({ ...d, player: clipped(d.player, 24) })}<div class="ab">${rows.join("")}</div><div style="height:8px"></div>${foot(d)}`,
		d.lang,
	);
}
