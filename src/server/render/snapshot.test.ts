import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { textEm } from "@/phi/lib/text-fit";
import { isJapaneseDocument } from "./css";
import { MEASURE_SLACK_PX, RenderEngine } from "./engine";
import { loadFontsFromDir } from "./fonts";
import {
	type AchievementsSnap,
	achievementsSnapHeight,
	achievementsSnapHtml,
	SNAP_W,
	type SuitsSnap,
	type SuitsTile,
	suitsSnapHeight,
	suitsSnapHtml,
	type TargetsSnap,
	type TypeSnap,
	targetsSnapHtml,
	typeSnapHeight,
	typeSnapHtml,
	type WrappedSnap,
	wrappedSnapHeight,
	wrappedSnapHtml,
} from "./snapshot";

const data: TargetsSnap = {
	brand: "PhiBot",
	host: "example.test",
	title: "Targets",
	player: "Player",
	meta: "",
	accent: "#fff",
	rows: [],
	labels: {
		song: "Song",
		constant: "Constant",
		acc: "Acc",
		target: "Target",
		empty: "None",
	},
};

test("a Japanese snapshot is marked Japanese", () => {
	assert.equal(
		isJapaneseDocument(targetsSnapHtml({ ...data, lang: "ja" })),
		true,
	);
	assert.equal(
		isJapaneseDocument(targetsSnapHtml({ ...data, lang: "zh-CN" })),
		false,
	);
	assert.equal(isJapaneseDocument(targetsSnapHtml(data)), false);
});

const wrapped: WrappedSnap = {
	brand: "PhiBot",
	host: "example.test",
	title: "2026 in review",
	player: "Player",
	meta: "",
	accent: "#fff",
	range: "January 1, 2026 to June 1, 2026, China time",
	tiles: Array.from({ length: 8 }, (_, i) => ({
		label: `Tile ${i}`,
		value: String(i),
		sub: i % 2 ? "Not enough data" : "",
	})),
	message: "",
	note: "Dates are when your save was uploaded.",
};

test("a Japanese wrapped snapshot is marked Japanese", () => {
	assert.equal(
		isJapaneseDocument(wrappedSnapHtml({ ...wrapped, lang: "ja" })),
		true,
	);
	assert.equal(
		isJapaneseDocument(wrappedSnapHtml({ ...wrapped, lang: "zh-CN" })),
		false,
	);
	assert.equal(isJapaneseDocument(wrappedSnapHtml(wrapped)), false);
});

test("wrapped snapshot text is escaped", () => {
	const html = wrappedSnapHtml({
		...wrapped,
		tiles: [{ label: "RKS", value: "<b>", sub: "" }],
	});
	assert.ok(html.includes("&lt;b&gt;"));
	assert.ok(!html.includes("<b>"));
});

test("a long tile value or type name is cut to one line, ellipsis included", () => {
	const html = wrappedSnapHtml({
		...wrapped,
		tiles: [
			{
				label: "Biggest step",
				value: "祈 -我ら神祖と共に歩む者なり-",
				sub: "IN 16.4 · 88.08% → 97.92% · ".repeat(3),
			},
			{ label: "Short", value: "Song 6", sub: "" },
		],
		pgti: {
			label: "PGTI",
			letters: ["P", "E", "S", "M"],
			suffix: "G",
			name: "长".repeat(30),
			groups: "Collectors · Clockwork",
		},
	});
	const text = (name: string) =>
		[...html.matchAll(new RegExp(`class="${name}">([^<]*)<`, "g"))].map(
			(m) => m[1] ?? "",
		);
	const [long = "", short = ""] = text("tile-value");
	assert.ok(long.endsWith("…"), long);
	assert.ok(textEm(long) <= 12, String(textEm(long)));
	assert.equal(short, "Song 6");
	assert.ok(textEm(text("tile-sub")[0] ?? "") <= 24);
	const [name = ""] = text("pgti-name");
	assert.ok(name.endsWith("…"), name);
	assert.ok(textEm(name) <= 13, String(textEm(name)));
	assert.equal(text("pgti-groups")[0], "Collectors · Clockwork");
	for (const rule of ["tile-value", "tile-sub", "pgti-name", "pgti-groups"]) {
		assert.match(html, new RegExp(`\\.${rule} \\{[^}]*white-space: nowrap`));
	}
});

test("a wrapped snapshot paints at its own size", async () => {
	const engine = new RenderEngine();
	await engine.init();
	const height = wrappedSnapHeight(wrapped);
	const img = await engine.renderHtml(wrappedSnapHtml(wrapped), {
		width: SNAP_W,
		height,
		format: "png",
	});
	assert.equal(img.width, 1200);
	assert.equal(img.height, height);
	await engine.close();
});

test("a long player name stays on one line, so the review image keeps its height and footer", async () => {
	const engine = new RenderEngine();
	await engine.init();
	const fonts = await loadFontsFromDir(
		join(process.cwd(), "phi-assets/html/common/font"),
	);
	for (const font of fonts) engine.registerFont(font);
	const named = (player: string) =>
		engine.renderHtml(
			wrappedSnapHtml({
				...wrapped,
				player,
				meta: "RKS 16.1234 · Sep 30, 2026",
			}),
			{ width: SNAP_W, format: "png" },
		);
	const short = await named("Player");
	assert.ok(short.height <= wrappedSnapHeight(wrapped));
	for (const wide of ["W".repeat(64), "我".repeat(64)]) {
		assert.equal((await named(wide)).height, short.height);
	}
	await engine.close();
});

const head = {
	brand: "PhiBot",
	host: "example.test",
	player: "Player",
	meta: "RKS 15.1234 · Nov 21, 2026",
	accent: "#4fc3f7",
};

const typed: TypeSnap = {
	...head,
	title: "Your PGTI",
	range: "November 21, 2025 to November 21, 2026, China time",
	letters: [
		{ letter: "P", pole: "Polish" },
		{ letter: "E", pole: "Explorer" },
		{ letter: "S", pole: "Steady" },
		{ letter: "M", pole: "Marathon" },
	],
	name: "The Cartographer",
	groups: [
		{ label: "Family", name: "Collectors", line: "Clean scores." },
		{ label: "Style", name: "Clockwork", line: "Steady hands." },
	],
	axes: ["P", "E", "S", "M"].map((letter) => ({
		letter,
		label: `Axis · ${letter}`,
		trait: "A trait.",
		fact: "A fact.",
	})),
	note: "For fun, not science.",
};

const tile = (title: string): SuitsTile => ({
	title,
	rank: "IN",
	c: "15.2",
	acc: "98.12%",
});

const suits = (counts: number[]): SuitsSnap => ({
	...head,
	title: "What suits you · Level 15",
	level: 15,
	count: "12 charts",
	none: "None",
	tiers: ["great", "good", "even", "hard", "wall"].map((tier, i) => ({
		tier,
		label: tier,
		tiles: Array.from({ length: counts[i] ?? 0 }, (_, j) => tile(`Song ${j}`)),
	})),
});

const board = (n: number): AchievementsSnap => ({
	...head,
	title: "Achievements",
	items: Array.from({ length: n }, (_, i) => ({
		name: `Ladder ${i}`,
		line: "What it counts",
		state: "3 now, next step at 5",
		steps: "1 of 4 steps",
		share: i / n,
		complete: i === n - 1,
	})),
});

test("the type picture grows by one row for the drive letter", () => {
	const drive = {
		...typed,
		drive: { letter: "G", pole: "Growing" },
		axes: [...typed.axes, { ...typed.axes[0]!, letter: "G" }],
	};
	assert.equal(typeSnapHeight(drive) - typeSnapHeight(typed), 92);
});

test("the table picture grows by one line of six jackets, and an empty tier keeps its row", () => {
	const base = suitsSnapHeight(suits([0, 0, 0, 0, 0]));
	assert.ok(base > 0);
	assert.equal(suitsSnapHeight(suits([1, 0, 0, 0, 0])) - base, 116 - 52);
	assert.equal(
		suitsSnapHeight(suits([6, 0, 0, 0, 0])),
		suitsSnapHeight(suits([1, 0, 0, 0, 0])),
	);
	assert.equal(
		suitsSnapHeight(suits([7, 0, 0, 0, 0])) -
			suitsSnapHeight(suits([6, 0, 0, 0, 0])),
		116 + 12,
	);
	assert.equal(
		suitsSnapHeight(suits([7, 1, 0, 0, 0])),
		suitsSnapHeight(suits([1, 7, 0, 0, 0])),
	);
	const html = suitsSnapHtml(suits([7, 0, 3, 0, 0]));
	assert.equal(html.match(/class="dt-tile[ "]/g)?.length, 10);
	assert.equal(html.match(/class="dt-line[ "]/g)?.length, 3);
	assert.equal(html.match(/class="dt-none"/g)?.length, 3);
});

test("the achievements board has two cards to a row", () => {
	const row =
		achievementsSnapHeight(board(2)) - achievementsSnapHeight(board(0));
	assert.ok(row > 0);
	assert.equal(
		achievementsSnapHeight(board(16)),
		achievementsSnapHeight(board(0)) + 8 * row,
	);
	assert.equal(
		achievementsSnapHeight(board(15)),
		achievementsSnapHeight(board(16)),
	);
	const html = achievementsSnapHtml(board(3));
	assert.equal(html.match(/class="ab-row"/g)?.length, 2);
	assert.equal(html.match(/class="ab-blank"/g)?.length, 1);
	assert.equal(html.match(/class="ab-card ab-done"/g)?.length, 1);
});

test("names and titles in the new pictures are escaped", () => {
	const evil = '<img src=x onerror="1">&';
	const pages = [
		typeSnapHtml({ ...typed, player: evil, name: evil }),
		suitsSnapHtml({
			...suits([1, 0, 0, 0, 0]),
			player: evil,
			tiers: [{ tier: "great", label: evil, tiles: [tile(evil)] }],
		}),
		achievementsSnapHtml({
			...board(1),
			player: evil,
			items: [{ ...board(1).items[0]!, name: evil, line: evil }],
		}),
	];
	for (const html of pages) {
		assert.ok(!html.includes("<img src=x"), html.slice(0, 200));
		assert.ok(html.includes("&lt;img src=x"));
	}
});

test("long titles and names are cut with an ellipsis", () => {
	const long = "祈 -我ら神祖と共に歩む者なり-";
	const html = suitsSnapHtml({
		...suits([0, 0, 0, 0, 0]),
		tiers: [{ tier: "great", label: "Best", tiles: [tile(long)] }],
	});
	const title = /class="dt-title">([^<]*)</.exec(html)?.[1] ?? "";
	assert.ok(title.endsWith("…"), title);
	assert.ok(textEm(title) <= 9.6);
	const poster = typeSnapHtml({ ...typed, name: "长".repeat(40) });
	const name = /class="ty-name">([^<]*)</.exec(poster)?.[1] ?? "";
	assert.ok(name.endsWith("…"), name);
	assert.ok(textEm(name) <= 16.5);
});

test("the new pictures fit their computed height, whatever the player name", async () => {
	const engine = new RenderEngine();
	await engine.init();
	const fonts = await loadFontsFromDir(
		join(process.cwd(), "phi-assets/html/common/font"),
	);
	for (const font of fonts) engine.registerFont(font);
	const cases: [string, (player: string) => string, number][] = [
		[
			"type",
			(player) => typeSnapHtml({ ...typed, player }),
			typeSnapHeight(typed),
		],
		[
			"suits",
			(player) => suitsSnapHtml({ ...suits([7, 2, 0, 1, 0]), player }),
			suitsSnapHeight(suits([7, 2, 0, 1, 0])),
		],
		[
			"achievements",
			(player) => achievementsSnapHtml({ ...board(16), player }),
			achievementsSnapHeight(board(16)),
		],
	];
	for (const [name, html, height] of cases) {
		const heights = [];
		for (const player of [
			"Player",
			"Tester 测试员 مرحبا ಕನ್ನಡ",
			"W".repeat(64),
		]) {
			const img = await engine.renderHtml(html(player), {
				width: SNAP_W,
				format: "png",
			});
			heights.push(img.height);
			assert.ok(
				img.height - MEASURE_SLACK_PX <= height,
				`${name}: ${img.height} > ${height}`,
			);
		}
		assert.equal(new Set(heights).size, 1, `${name}: ${heights.join(", ")}`);
		const painted = await engine.renderHtml(html("Player"), {
			width: SNAP_W,
			height,
			format: "png",
		});
		assert.equal(painted.height, height);
	}
	await engine.close();
});
