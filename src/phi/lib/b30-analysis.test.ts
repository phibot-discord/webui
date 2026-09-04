import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Renderer } from "@takumi-rs/core";
import sharp from "sharp";
import { render } from "takumi-js";
import { fromHtml } from "takumi-js/helpers/html";
import { applyIllPaths } from "../../server/ill";
import { rewriteLocalUrls } from "../../server/render/html";
import {
	buildTagAnalysis,
	buildTagRadar,
	type ChartTagTreeNode,
} from "./b30-analysis";
import { localizeChartTagLabels, localizeChartTagName } from "./card-i18n";
import { tagRadarHtml, tagRadarPlotPng, tagRadarPlotSvg } from "./charts";

const rec = (id: string, rank: string, rks: number) => ({
	id,
	rank,
	rks,
	kind: "best" as const,
	slot: "B1",
});

const tree: ChartTagTreeNode[] = [
	{
		name: "读谱",
		children: [{ name: "面海" }, { name: "脑裂" }],
	},
	{
		name: "硬抗",
		children: [{ name: "快交互" }],
	},
];

test("radar uses a top-starting pentagon matching the B30 panel viewBox", () => {
	const radar = buildTagRadar([
		{ name: "读谱", rks: 15.72, votes: 10, hasVotes: true },
		{ name: "硬抗", rks: 15.94, votes: 10, hasVotes: true },
		{ name: "拆谱", rks: 15.38, votes: 10, hasVotes: true },
		{ name: "定位", rks: 15.51, votes: 10, hasVotes: true },
		{ name: "多指", rks: 15.12, votes: 10, hasVotes: true },
	]);
	assert.equal(radar.axes.length, 5);
	assert.equal(radar.grids.length, 4);
	assert.equal(radar.categories.length, 5);
	assert.ok(Math.abs(radar.axes[0]!.x - 100) < 0.05);
	assert.ok(Math.abs(radar.axes[0]!.y - 37) < 0.05);
	assert.ok(Math.abs(radar.axes[1]!.x - 152.3) < 0.2);
	assert.ok(Math.abs(radar.axes[1]!.y - 75) < 0.2);
	const high = radar.categories[1]!;
	const low = radar.categories[4]!;
	const dist = (c: { pointX: number; pointY: number }) =>
		Math.hypot(c.pointX - 100, c.pointY - 92);
	assert.ok(dist(high) > dist(low));
	assert.equal(high.displayRks, "15.94");
});

test("radar uses a fixed 0-17 rks radius instead of min-max stretching", () => {
	const radar = buildTagRadar([
		{ name: "读谱", rks: 16.27, votes: 10, hasVotes: true },
		{ name: "硬抗", rks: 16.34, votes: 10, hasVotes: true },
		{ name: "拆谱", rks: 16.28, votes: 10, hasVotes: true },
		{ name: "定位", rks: 16.33, votes: 10, hasVotes: true },
		{ name: "多指", rks: 6.34, votes: 10, hasVotes: true },
	]);
	const dist = (c: { pointX: number; pointY: number }) =>
		Math.hypot(c.pointX - 100, c.pointY - 92);
	const high = radar.categories[1]!;
	const near = radar.categories[0]!;
	const low = radar.categories[4]!;
	assert.ok(Math.abs(dist(high) / 55 - 16.34 / 17) < 0.03);
	assert.ok(Math.abs(dist(low) / 55 - 6.34 / 17) < 0.03);
	assert.ok(Math.abs(dist(high) - dist(near)) < 2);
	assert.ok(dist(low) > 18 && dist(low) < 28);
});

test("weights B30 rks by community tag votes and splits strong vs weak", () => {
	const analysis = buildTagAnalysis(
		[
			rec("song-a", "IN", 16),
			rec("song-b", "IN", 14),
			rec("song-c", "AT", 15),
			rec("song-d", "HD", 15.4),
		],
		tree,
		{
			"song-a": { IN: { 面海: 10, 快交互: 5 } },
			"song-b": { IN: { 面海: 10, 脑裂: 8 } },
			"song-c": { AT: { 快交互: 20 } },
			"song-d": { HD: { 快交互: 4, 脑裂: 6 } },
		},
	);
	assert.equal(analysis.insufficient, false);
	assert.ok(analysis.totalVotes > 0);
	const ranked = [...analysis.strong, ...analysis.weak];
	const mianhai = ranked.find((tag) => tag.name === "面海");
	assert.ok(mianhai);
	assert.ok(Math.abs(mianhai.rks - 15) < 1e-9);
	assert.equal(analysis.strong[0]!.name, "快交互");
	assert.equal(analysis.weak[0]!.name, "脑裂");
	const reading = analysis.radar.categories.find((c) => c.name === "读谱");
	assert.ok(reading?.hasVotes);
	assert.ok(reading!.rks < 15.5);
});

test("radar plot is a white PNG, not a black Takumi SVG/clip-path fill", async () => {
	const radar = buildTagRadar([
		{ name: "读谱", rks: 16.28, votes: 10, hasVotes: true },
		{ name: "硬抗", rks: 16.34, votes: 10, hasVotes: true },
		{ name: "拆谱", rks: 15.4, votes: 10, hasVotes: true },
		{ name: "定位", rks: 15.5, votes: 10, hasVotes: true },
		{ name: "多指", rks: 15.1, votes: 10, hasVotes: true },
	]);
	const svg = tagRadarPlotSvg(radar);
	assert.match(svg, /fill="none"/);
	assert.match(svg, /fill="#ffffff"/);
	assert.match(svg, /fill-opacity="0\.92"/);
	assert.doesNotMatch(svg, /<text\b/);

	const plotPng = await tagRadarPlotPng(radar);
	const plotMeta = await sharp(plotPng).metadata();
	assert.equal(plotMeta.width, 400);
	assert.equal(plotMeta.height, 368);

	const png = await sharp(Buffer.from(svg)).png().toBuffer();
	const { data } = await sharp(png).raw().ensureAlpha().toBuffer({
		resolveWithObject: true,
	});
	let white = 0;
	let black = 0;
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i]!;
		const g = data[i + 1]!;
		const b = data[i + 2]!;
		const a = data[i + 3]!;
		if (a < 8) continue;
		if (r > 200 && g > 200 && b > 200 && a > 80) white++;
		if (r < 20 && g < 20 && b < 20 && a > 200) black++;
	}
	assert.ok(white > 500, `expected white fill, got ${white} white pixels`);
	assert.equal(black, 0);

	const html = await tagRadarHtml(radar);
	assert.match(html, /class="tag-radar-plot"/);
	assert.match(html, /src="file:\/\//);
	assert.match(html, /读谱/);
	assert.match(html, /16\.34/);

	const enHtml = await tagRadarHtml(
		localizeChartTagLabels(
			{
				categories: radar.categories,
				radar,
				strong: [],
				weak: [],
			},
			"en",
		).radar,
	);
	assert.match(enHtml, /Reading/);
	assert.match(enHtml, /Stamina/);
	assert.match(enHtml, /Multi-/);
	assert.match(enHtml, />Finger</);
	assert.doesNotMatch(enHtml, /Multi-Finger/);
	assert.doesNotMatch(enHtml, /读谱/);
	assert.equal(localizeChartTagName("读谱", "zh"), "读谱");
	assert.equal(localizeChartTagName("多指", "en"), "Multi-Finger");
	assert.equal(localizeChartTagName("快交互", "en"), "Fast interaction");
	assert.doesNotMatch(html, /<svg\b/i);
	assert.doesNotMatch(html, /clip-path/);
	assert.doesNotMatch(html, /data:image\/png;base64,/);

	const illMap = new Map<string, string>();
	for (let i = 0; i < 33; i++) {
		illMap.set(
			`/Users/yue/projects/phigros/original_ill/ill/song${i}.png`,
			`/tmp/phi-web-ill/ill/song${i}.png`,
		);
	}
	const afterIll = applyIllPaths(html, illMap);
	assert.match(afterIll, /src="file:\/\//);
	assert.doesNotMatch(afterIll, /\/tmp\/phi-web-ill\//);

	const rewritten = rewriteLocalUrls(afterIll, process.cwd());
	assert.equal(rewritten.images.length, 1);
	assert.match(rewritten.images[0]!.src, /^file:\/\//);

	const bgPng = await sharp({
		create: {
			width: 8,
			height: 8,
			channels: 4,
			background: { r: 20, g: 8, b: 8, alpha: 255 },
		},
	})
		.png()
		.toBuffer();
	const bgSrc = `data:image/png;base64,${bgPng.toString("base64")}`;

	const parsed = fromHtml(
		`<div class="background" style="width:560px;height:340px;position:relative;">` +
			`<img alt="bg" src="${bgSrc}"/>` +
			`<div class="analysis-panel clip-box tag-analysis-panel" style="width:560px;height:340px;background:rgba(0,0,0,0.72);padding:15px;">${rewritten.html}</div>` +
			`</div>`,
	);
	const sheets = [
		readFileSync(
			new URL("../../../phi-assets/html/common/common.css", import.meta.url),
			"utf8",
		),
		readFileSync(
			new URL("../../../phi-assets/html/b19/b19.css", import.meta.url),
			"utf8",
		),
		readFileSync(new URL("../css/takumi.css", import.meta.url), "utf8"),
	];
	const bytes = Buffer.from(
		await render(parsed.node, {
			renderer: new Renderer(),
			width: 560,
			height: 340,
			format: "png",
			stylesheets: sheets,
			images: rewritten.images.map((image) => ({
				src: image.src,
				data: new Uint8Array(image.data),
			})),
		} as never),
	);
	const painted = await sharp(bytes).raw().ensureAlpha().toBuffer({
		resolveWithObject: true,
	});
	const w = painted.info.width;
	const h = painted.info.height;
	let bright = 0;
	let maxL = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < Math.min(280, w); x++) {
			const i = (y * w + x) * 4;
			const r = painted.data[i]!;
			const g = painted.data[i + 1]!;
			const b = painted.data[i + 2]!;
			const spread = Math.max(r, g, b) - Math.min(r, g, b);
			if (r > 160 && g > 160 && b > 160 && spread < 40) bright++;
			const l = Math.min(r, g, b);
			if (spread < 40 && l > maxL) maxL = l;
		}
	}
	assert.ok(
		bright > 150 && maxL > 200,
		`takumi plot not white: bright=${bright} maxL=${maxL}`,
	);
});

test("tag ranking sits right of English radar labels and is vertically centered", async () => {
	const b19Css = readFileSync(
		new URL("../../../phi-assets/html/b19/b19.css", import.meta.url),
		"utf8",
	);
	const takumiCss = readFileSync(
		new URL("../css/takumi.css", import.meta.url),
		"utf8",
	);
	assert.match(b19Css, /\.tag-radar-column \{\n\twidth: 280px;/);
	assert.match(takumiCss, /width: 280px !important;/);
	assert.match(takumiCss, /padding-top: 4px !important;/);
	assert.match(takumiCss, /left: -36px !important;/);
	assert.doesNotMatch(
		takumiCss,
		/\.histogram-slot-label \{[^}]*writing-mode: horizontal-tb/,
	);

	const radar = buildTagRadar([
		{ name: "读谱", rks: 16.28, votes: 10, hasVotes: true },
		{ name: "硬抗", rks: 16.34, votes: 10, hasVotes: true },
		{ name: "拆谱", rks: 15.4, votes: 10, hasVotes: true },
		{ name: "定位", rks: 15.5, votes: 10, hasVotes: true },
		{ name: "多指", rks: 15.1, votes: 10, hasVotes: true },
	]);
	const enRadar = localizeChartTagLabels(
		{
			categories: radar.categories,
			radar,
			strong: [],
			weak: [],
		},
		"en",
	).radar;
	const radarHtml = await tagRadarHtml(enRadar);
	const rewritten = rewriteLocalUrls(radarHtml, process.cwd());
	const row = (name: string, rks: string) =>
		`<div class="tag-result-row"><p class="tag-rank">1</p><p class="tag-name">${name}</p><p class="tag-rks">${rks}</p></div>`;
	const html =
		`<div class="tag-analysis-body" style="width:430px;height:216px;background:#102030;">` +
		`<div class="tag-analysis-content">` +
		`<div class="tag-radar-column">` +
		`<div class="tag-radar-title"><span></span><p>Categories</p></div>` +
		`${rewritten.html}` +
		`</div>` +
		`<div class="tag-ranking-column" style="border-left:4px solid #00ff66;">` +
		`<div class="tag-ranking-group strong-tags" style="border-top:4px solid #ff40c8;">` +
		`<div class="tag-column-title"><span></span><p>Strengths</p></div>` +
		`${row("Fast trills", "16.20")}${row("Note flood", "15.80")}${row("Jacks", "15.40")}` +
		`</div>` +
		`<div class="tag-ranking-group weak-tags">` +
		`<div class="tag-column-title"><span></span><p>Weaknesses</p></div>` +
		`${row("Flicks", "12.10")}${row("Hand stretch", "11.40")}${row("Minijacks", "10.90")}` +
		`</div>` +
		`</div></div></div>`;
	const parsed = fromHtml(html);
	const bytes = Buffer.from(
		await render(parsed.node, {
			renderer: new Renderer(),
			width: 430,
			height: 216,
			format: "png",
			stylesheets: [
				readFileSync(
					new URL("../../../phi-assets/html/b19/b19.css", import.meta.url),
					"utf8",
				),
				readFileSync(new URL("../css/takumi.css", import.meta.url), "utf8"),
			],
			images: rewritten.images.map((image) => ({
				src: image.src,
				data: new Uint8Array(image.data),
			})),
		} as never),
	);
	const painted = await sharp(bytes).raw().ensureAlpha().toBuffer({
		resolveWithObject: true,
	});
	const w = painted.info.width;
	const h = painted.info.height;
	let greenX = w;
	let pinkY = h;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const r = painted.data[i]!;
			const g = painted.data[i + 1]!;
			const b = painted.data[i + 2]!;
			if (g > 200 && r < 80 && b < 140 && x < greenX) greenX = x;
			if (r > 200 && b > 140 && g < 90 && y < pinkY) pinkY = y;
		}
	}
	assert.ok(greenX > 280, `ranking column too far left: x=${greenX}`);
	assert.ok(
		pinkY >= 2 && pinkY < 40,
		`ranking lists not vertically centered: y=${pinkY}`,
	);
});

test("marks analysis insufficient when B30 charts have no tag votes", () => {
	const analysis = buildTagAnalysis([rec("song-a", "IN", 16)], tree, {
		"song-a": { IN: { 面海: 0, 快交互: 0 } },
	});
	assert.equal(analysis.insufficient, true);
	assert.equal(analysis.totalVotes, 0);
	assert.equal(analysis.strong.length, 0);
	assert.equal(analysis.weak.length, 0);
});
