import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { textEm } from "@/phi/lib/text-fit";
import { isJapaneseDocument } from "./css";
import { RenderEngine } from "./engine";
import { loadFontsFromDir } from "./fonts";
import {
	SNAP_W,
	type TargetsSnap,
	targetsSnapHtml,
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
