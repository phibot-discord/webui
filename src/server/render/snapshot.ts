import { escapeHtml } from "@/phi/lib/html";
import { clipEm, textEm } from "@/phi/lib/text-fit";

export const SNAP_PROGRESS = "snap/progress";
export const SNAP_TARGETS = "snap/targets";
export const SNAP_WRAPPED = "snap/wrapped";
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
