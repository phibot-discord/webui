import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Renderer } from "@takumi-rs/core";
import sharp from "sharp";
import { render } from "takumi-js";
import { fromHtml } from "takumi-js/helpers/html";
import { loadFontsFromDir, PHI_FONT_FILES } from "@/server/render/fonts";
import { compileArt } from "@/server/render/html";
import { cardCopy } from "./card-i18n";
import { Catalog } from "./catalog";
import { classicPrepare } from "./classic";

const RES = "/res/phi-assets";
const ctx = {
	kind: "b30" as const,
	locale: "en" as const,
	catalog: new Catalog(RES),
};

function compile(tpl: "b19/b19" | "update/update", raw: object): string {
	const prepare = classicPrepare(tpl.split("/")[1] as string);
	assert.ok(prepare);
	return compileArt(`${RES}/html/${tpl}.art`, {
		sys: { scale: "" },
		tips: "",
		theme: "default",
		lang: "en",
		t: cardCopy("en"),
		defaultLayout: `${RES}/html/common/layout/default.art`,
		_res_path: `${RES}/`,
		...prepare(raw as Record<string, unknown>, ctx),
	});
}

type Histogram = {
	slots: { label: string; kind: string; height: number }[];
	ticks: { position: number; label: string }[];
	average: number;
	averagePosition: number;
};

const song = (over: object = {}) => ({
	song: "Stasis",
	rank: "IN",
	Rating: "V",
	rks: 15.5,
	difficulty: 15.9,
	score: 990000,
	acc: 99.5,
	suggest: "99.80%",
	illustration: "/ill/a.png",
	num: 1,
	...over,
});

const b19 = (over: object = {}) => ({
	gameuser: {
		avatar: "Introduction",
		PlayerId: "Player",
		rks: 16.1234,
		data: "1MiB",
		ChallengeMode: 3,
		ChallengeModeRank: 45,
	},
	Date: "2026/01/01 00:00:00",
	rksStddev: 0,
	stats: ["EZ", "HD", "IN", "AT"].map((title, i) => ({
		title,
		cleared: i,
		fc: 0,
		phi: 12,
	})),
	b19_list: [song()],
	...over,
});

function histogramHtml(histogram: Histogram) {
	const html = compile(
		"b19/b19",
		b19({ b30Analysis: { histogram: { ...histogram, count: 30 } } }),
	);
	const summaryAt = html.indexOf('<div class="histogram-summary"');
	const chartAt = html.indexOf('<div class="histogram-chart"');
	const summary = html.slice(summaryAt, html.indexOf("</div>", summaryAt) + 6);
	const chart = html
		.slice(chartAt, html.indexOf('<div class="histogram-legend">'))
		.trim();
	return { summary, chart };
}

test("the histogram keeps ticks in-flow and stacks slot labels", () => {
	const { summary, chart } = histogramHtml({
		slots: [
			{ label: "P1", kind: "phi", height: 90 },
			{ label: "B12", kind: "best", height: 80 },
		],
		ticks: [
			{ position: 0, label: "16.00" },
			{ position: 50, label: "16.25" },
			{ position: 100, label: "16.50" },
		],
		average: 16.3335,
		averagePosition: 66,
	});
	assert.match(summary, /Average RKS<\/p><p [^>]*>16\.3335</);
	assert.match(chart, /class="histogram-y-tick" style="[^"]*bottom:0px/);
	assert.match(chart, /class="histogram-y-tick" style="[^"]*bottom:68px/);
	assert.match(chart, /class="histogram-y-tick" style="[^"]*bottom:136px/);
	assert.match(chart, /left:40px/);
	assert.match(chart, /<span>Per-chart<\/span><span>RKS<\/span>/);
	assert.match(chart, /<span>P<\/span><span>1<\/span>/);
	assert.match(chart, /<span>B<\/span><span>12<\/span>/);
	assert.match(chart, /class="histogram-bar phi-bar" style="height:122px;/);
	assert.match(chart, /class="average-marker" style="[^"]*bottom:90px/);
	assert.match(chart, /AVG 16.3335/);
});

function fixtureHtml(laidOut: { summary: string; chart: string }): string {
	return (
		`<div style="width:489px;height:340px;background:#071018;padding:15px 28px 22px;box-sizing:border-box;">` +
		`<div class="analysis-panel-head">` +
		`<div><p class="analysis-kicker">RKS DISTRIBUTION</p>` +
		`<p class="analysis-title" style="font-size:16px;white-space:nowrap;color:#fff;">Equivalent RKS histogram</p></div>` +
		laidOut.summary +
		`</div>` +
		laidOut.chart +
		`<div class="histogram-legend"><p>30 slots</p></div>` +
		`</div>`
	);
}

async function renderTakumi(
	html: string,
	width: number,
	height: number,
): Promise<Buffer> {
	const renderer = new Renderer();
	const fonts = await loadFontsFromDir(
		fileURLToPath(
			new URL("../../../phi-assets/html/common/font", import.meta.url),
		),
		PHI_FONT_FILES,
	);
	for (const f of fonts) {
		await renderer.registerFont({
			name: f.name,
			data: f.data,
			weight: f.weight ?? 400,
			style: f.style ?? "normal",
			generic: f.generic,
		});
	}
	return Buffer.from(
		await render(fromHtml(html).node, {
			renderer,
			width,
			height,
			format: "png",
			fontFamilies: fonts.map((f) => f.name),
			css: [
				readFileSync(
					new URL("../../../phi-assets/html/b19/b19.css", import.meta.url),
					"utf8",
				),
				readFileSync(new URL("../css/takumi.css", import.meta.url), "utf8"),
			],
		} as never),
	);
}

async function pixels(bytes: Buffer) {
	const painted = await sharp(bytes).raw().ensureAlpha().toBuffer({
		resolveWithObject: true,
	});
	const w = painted.info.width;
	const h = painted.info.height;
	const at = (x: number, y: number) => {
		const i = (y * w + x) * 4;
		return [
			painted.data[i]!,
			painted.data[i + 1]!,
			painted.data[i + 2]!,
		] as const;
	};
	return { w, h, at };
}

const isCyan = (r: number, g: number, b: number) =>
	b > 140 && g > 90 && r < 80 && b > r + 40;

test("Takumi paints a single histogram with a left RKS gutter", async () => {
	const slots = [
		...[1, 2, 3].map((n) => ({
			label: `P${n}`,
			kind: "phi",
			height: 92 - n * 4,
		})),
		...Array.from({ length: 27 }, (_, i) => ({
			label: `B${i + 1}`,
			kind: "best",
			height: 80 - i * 1.6,
		})),
	];
	const ticks = [0, 25, 50, 75, 100].map((p, i) => ({
		position: p,
		label: (16 + i * 0.25).toFixed(2),
	}));
	const html = fixtureHtml(
		histogramHtml({ slots, ticks, average: 16.3335, averagePosition: 66 }),
	);
	const bytes = await renderTakumi(html, 489, 340);
	const { w, h, at } = await pixels(bytes);
	const isWhiteBar = (r: number, g: number, b: number) =>
		r > 180 && g > 180 && b > 180 && Math.max(r, g, b) - Math.min(r, g, b) < 40;

	let titleCyan = 0;
	for (let y = 0; y < Math.min(52, h); y++) {
		for (let x = 0; x < w; x++) {
			const [r, g, b] = at(x, y);
			if (isCyan(r, g, b)) titleCyan++;
		}
	}
	let gutterCyan = 0;
	let gutterLight = 0;
	let plotCyan = 0;
	let plotWhite = 0;
	for (let y = 80; y < Math.min(230, h); y++) {
		for (let x = 0; x < Math.min(40, w); x++) {
			const [r, g, b] = at(x, y);
			if (isCyan(r, g, b)) gutterCyan++;
			if (r > 140 && g > 140 && b > 140) gutterLight++;
		}
		for (let x = 48; x < w; x++) {
			const [r, g, b] = at(x, y);
			if (isCyan(r, g, b)) plotCyan++;
			if (isWhiteBar(r, g, b)) plotWhite++;
		}
	}
	assert.ok(titleCyan < 80, `title overlapped bars: titleCyan=${titleCyan}`);
	assert.ok(
		gutterCyan < 40 && gutterLight > 20,
		`gutter broken: cyan=${gutterCyan} light=${gutterLight}`,
	);
	assert.ok(
		plotCyan > 400 && plotWhite > 80,
		`plot missing bars: cyan=${plotCyan} white=${plotWhite}`,
	);
	let firstCyanX = w;
	for (let y = 160; y < Math.min(250, h); y++) {
		for (let x = 0; x < w; x++) {
			const [r, g, b] = at(x, y);
			if (isCyan(r, g, b) && x < firstCyanX) firstCyanX = x;
		}
	}
	assert.ok(
		firstCyanX > 90,
		`cyan bars started too far left: firstCyanX=${firstCyanX}`,
	);
});

test("a bar at a tick's value reaches that grid line, and every bar stands on the axis", async () => {
	// 15.50-17.50 axis with a 17.0043 best: the bar used to stop 1px under the 17.00 line
	const { chart } = histogramHtml({
		slots: [{ label: "B1", kind: "best", height: 75.215 }],
		ticks: [0, 25, 50, 75, 100].map((position) => ({ position, label: "" })),
		average: 16.3335,
		averagePosition: 100,
	});
	const bytes = await renderTakumi(
		`<div style="width:240px;height:200px;background:#000;">${chart}</div>`,
		240,
		200,
	);
	const { h, at } = await pixels(bytes);
	// The bar spans x 68-209; grid lines are dashed, so look along the gap beside it
	const barX = 140;
	const lightRows: number[] = [];
	let barTop = -1;
	let barBottom = -1;
	for (let y = 0; y < h; y++) {
		for (let x = 44; x < 62; x++) {
			const [r, g, b] = at(x, y);
			if (r > 40 && g > 40 && b > 40) {
				lightRows.push(y);
				break;
			}
		}
		if (isCyan(...at(barX, y))) {
			if (barTop < 0) barTop = y;
			barBottom = y;
		}
	}
	// Lines at 17.00 / 16.50 / 16.00 / 15.50 and the axis border; 17.50 sits on the clip edge
	const axis = lightRows[lightRows.length - 1]!;
	const line1700 = lightRows[lightRows.length - 5]!;
	assert.equal(
		barTop,
		line1700 + 1,
		`bar top ${barTop}, 17.00 line ${line1700}`,
	);
	assert.equal(barBottom, axis - 1, `bar bottom ${barBottom}, axis ${axis}`);
});

test("a long player name shrinks and moves right of the RKS box; a short one is left alone", () => {
	const short = compile("b19/b19", b19());
	assert.match(short, /<p name="pvis">Player<\/p>/);
	const long = compile(
		"b19/b19",
		b19({
			gameuser: { ...b19().gameuser, PlayerId: "W".repeat(30) },
			rksStddev: 0.25,
		}),
	);
	const style = /<p name="pvis" style="([^"]*)">W{30}<\/p>/.exec(long)?.[1];
	assert.match(style ?? "", /^font-size:\d+\.\dpx;padding-left:\d+px$/);
	assert.ok(Number(/font-size:([\d.]+)px/.exec(style ?? "")?.[1]) < 32);
	assert.match(
		long,
		/<\/div><div class="rks clip-box">[\s\S]*?<\/div><div class="avatar clip-box">/,
	);
});

test("the player's rich text loses filter styles before it is drawn", () => {
	const name = '<span style="color:red;filter:blur(2px)">A</span>&ensp;B<br>C';
	const card = compile(
		"b19/b19",
		b19({ gameuser: { ...b19().gameuser, PlayerId: name } }),
	);
	assert.match(card, /<span style="color:red">A<\/span>&nbsp;B<br>C/);
	const update = compile("update/update", updateCard({ PlayerId: name }));
	assert.match(update, /Player: <span style="color:red">A<\/span>&nbsp;B<br>C/);
	assert.doesNotMatch(card + update, /blur\(/);
});

test("song titles shrink to fit, then wrap onto two lines", () => {
	const html = compile(
		"b19/b19",
		b19({
			b19_list: [
				song({ song: "Stasis" }),
				song({
					song: "What do you want more than a Happy ending? And then some more words",
				}),
				song({ song: 'A&B <C> "D"', rank: "LEGACY" }),
			],
		}),
	);
	assert.match(
		html,
		/<div class="info-IN"><div class="info-mid">\s*<div class="songname"><p name="pvis" style="font-size:15px">Stasis<\/p>/,
	);
	const wrapped =
		/<div class="songname songname-wrap">((?:<p name="pvis" style="font-size:[\d.]+px">[^<]*<\/p>){2})/.exec(
			html,
		);
	assert.ok(wrapped, "the long title wraps");
	assert.match(wrapped[1] ?? "", /What do you want/);
	assert.match(html, /<div class="info-LEGACY">\s*<div class="songname">/);
	assert.match(html, />A&#38;B &#60;C&#62; &#34;D&#34;<\/p>/);
});

test("rank badges that overflow the song panel step down a size and drop the total", () => {
	const fits = (accRanks: object[]) => {
		const html = compile("b19/b19", b19({ b19_list: [song({ accRanks })] }));
		return [
			...html.matchAll(
				/<div class="accAvg ([^"]*)">([\s\S]*?)<\/div>\s*(?=<div class="accAvg|<\/div>)/g,
			),
		].map((m) => ({
			px: /rank-px-(\d+)/.exec(m[1] ?? "")?.[1] ?? "12",
			of: /accRankOf/.test(m[2] ?? ""),
		}));
	};
	assert.deepEqual(fits([{ pos: "#12", of: "/ 3456", pct: "0.35%" }]), [
		{ px: "12", of: true },
	]);
	const tight = fits([
		{
			scope: "band",
			tag: "±0.05 RKS band",
			pos: "#12345",
			of: "/ 1234567",
			pct: "100.00%",
		},
		{ tag: "All records", pos: "#1234567", of: "/ 12345678", pct: "12.34%" },
	]);
	assert.equal(tight.length, 2);
	assert.ok(tight.every((f) => f.px !== "12" && !f.of));
	assert.deepEqual(
		fits([
			{ show: "percent", tag: "All", pos: "#12", of: "/ 3456", pct: "0.35%" },
		]),
		[{ px: "12", of: false }],
	);
});

test("the stats table hides with the record stats option, and a tip closes the card", () => {
	const shown = compile("b19/b19", { ...b19(), tips: "Keep going" });
	assert.match(
		shown,
		/<div class="stats-table"><div class="stats-row stats-row-0"/,
	);
	assert.match(
		shown,
		/class="stats-lab"[^>]*>&nbsp;<\/div><div class="stats-val"[^>]*>EZ</,
	);
	assert.match(
		shown,
		/class="stats-lab"[^>]*>Phi<\/div><div class="stats-val"[^>]*>12</,
	);
	const hidden = compile("b19/b19", b19({ hideRecordStats: true }));
	assert.doesNotMatch(hidden, /recordInfo|stats-table/);
});

const updateCard = (over: object = {}) => ({
	PlayerId: "Player",
	Rks: "16.1234",
	Date: "2026/01/01 00:00:00",
	ChallengeMode: 3,
	ChallengeModeRank: 45,
	added_rks_notes: ["+0.0100", ""],
	rks_history: [[0, 0, 100, 100]],
	rks_range: [16, 16.2],
	rks_date: ["2026/01/01", "2026/02/01"],
	task_data: null,
	box_line: [
		[
			{
				date: "2026/01/01 00:00:00",
				color: "#1168b5",
				width: 151,
				update_num: 2,
				song: [
					{
						song: "Stasis",
						illustration: "/ill/a.png",
						rank: "IN",
						Rating: "V",
						score_new: 990000,
						acc_new: 99.5,
						rks_new: 15.5,
					},
				],
			},
		],
	],
	...over,
});

test("the update card draws its RKS line as one path and its tiles as two text lines", () => {
	const html = compile("update/update", updateCard());
	assert.match(html, /<path d="M 0\.00 100\.00 L 100\.00 0\.00"/);
	assert.doesNotMatch(html, /<line /);
	assert.match(html, /phi-css:\/\/update\.css/);
	assert.match(html, />IN {2}990000<\/p><p [^>]*>99\.5000% {2}15\.5000<\/p>/);
	assert.match(html, /class="box_title" style="flex:0 0 151px;/);
	assert.match(html, /Updated × 2/);
});

test("an accuracy just under a whole number prints once", () => {
	const prepare = classicPrepare("update");
	assert.ok(prepare);
	const tile = (acc_new: number) => ({
		song: "Stasis",
		rank: "IN",
		score_new: 990000,
		acc_new,
	});
	const out = prepare(
		updateCard({
			box_line: [[{ date: "2026/01/01 00:00:00", song: [tile(98.99999)] }]],
			task_data: [tile(97.1234)],
		}),
		ctx,
	);
	const boxes = out.box_line as { song: { accText: string }[] }[][];
	assert.equal(boxes[0]?.[0]?.song[0]?.accText, "99.0000");
	const tasks = out.task_data as { accText: string }[];
	assert.equal(tasks[0]?.accText, "97.1234");
	const html = compile(
		"update/update",
		updateCard({
			box_line: [[{ date: "2026/01/01 00:00:00", song: [tile(98.99999)] }]],
		}),
	);
	assert.match(html, />99\.0000%</);
	assert.doesNotMatch(html, /98\.1\.0000%/);
});

test("an update card with no records keeps the plain chart box and skips update.css", () => {
	const html = compile("update/update", updateCard({ box_line: [] }));
	assert.match(html, /<div class="value_box">\s*<p>16\.2000<\/p>/);
	assert.doesNotMatch(html, /phi-css:\/\/update\.css|record_box/);
	assert.match(html, /NOT_FOUND/);
});

test("line segments the old markup could not express are left out of the path", () => {
	const mixed = compile(
		"update/update",
		updateCard({
			rks_history: [
				[0, 0, 1e-7, 50],
				[1e-7, 50, 100, 100],
				[0, 25, 100, 75],
			],
		}),
	);
	assert.match(mixed, /<path d="M 0\.00 75\.00 L 100\.00 25\.00"/);
	const none = compile(
		"update/update",
		updateCard({ rks_history: [[0, 0, 1e-7, 50]] }),
	);
	assert.match(none, /<line x1="0%" y1="0%" x2="1e-7%" y2="50%">/);
});
