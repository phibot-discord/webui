import assert from "node:assert/strict";
import test from "node:test";
import { formatDay } from "@/i18n/datetime";
import { toolsEn } from "@/i18n/tools-messages";
import { fill } from "@/phi/lib/card-i18n";
import type { SaveHistory } from "@/phi/lib/save-history";
import type { ChartSummary } from "./charts";
import { wrappedSnapHeight, wrappedSnapHtml } from "./render/snapshot";
import { type ReviewView, reviewView } from "./review";

const LONG = "An Unbelievably Long Song Title That Never Seems To End";

const list: ChartSummary[] = [
	{ id: "A.0", song: "Song A", composer: "", charts: { IN: [15, 800] } },
	{
		id: "L.0",
		song: LONG,
		composer: "",
		charts: { IN: [15, 900], AT: [16, 1000] },
	},
];

type History = Pick<SaveHistory, "rks" | "scoreHistory">;

const history = (
	scoreHistory: SaveHistory["scoreHistory"],
	rks: [string, number][] = [],
): History => ({
	scoreHistory,
	rks: rks.map(([date, value]) => ({ date: new Date(date), value })),
});

const EMPTY = history({});

const SINCE_2025 = history(
	{
		"A.0": {
			IN: [
				[95, 950000, "2025-06-01T04:00:00Z", false],
				[97, 970000, "2025-09-01T04:00:00Z", false],
				[98, 980000, "2026-03-01T04:00:00Z", false],
			],
		},
	},
	[
		["2025-06-01T04:00:00Z", 14.5],
		["2025-09-01T04:00:00Z", 14.6],
		["2026-03-01T04:00:00Z", 14.7],
	],
);

const review = (
	data: History,
	opts: {
		requested?: string | null;
		manual?: boolean;
		phase?: "open" | "complete" | "unlinked";
		locale?: "en" | "zh" | "ja";
	} = {},
) =>
	shown(
		reviewView({
			phase: opts.phase ?? "complete",
			locale: opts.locale ?? "en",
			requested: opts.requested ?? null,
			manual: opts.manual ?? false,
			history: data,
			list,
		}),
	);

function shown(view: ReviewView) {
	if (view.state === "soon") throw new Error("the review is not open");
	return view;
}

test("before it opens the page only names the opening day", () => {
	assert.deepEqual(reviewView({ phase: "soon", locale: "en" }), {
		state: "soon",
		opens: "December 1, 2026",
	});
	for (const locale of ["zh", "ja"] as const) {
		assert.deepEqual(reviewView({ phase: "soon", locale }), {
			state: "soon",
			opens: formatDay("2026-12-01", locale),
		});
	}
});

test("a year with history before it shows every tile and the whole range; earlier years have no recap", () => {
	const view = review(SINCE_2025);
	assert.equal(view.state, "ok");
	assert.equal(view.year, 2026);
	assert.deepEqual(view.years, [2026]);
	assert.equal(view.soFar, false);
	assert.equal(view.tiles.length, 8);
	assert.equal(view.range, "January 1, 2026 to March 1, 2026, China time");
	assert.equal(view.note, toolsEn.wrapped.note);
	assert.deepEqual(view.size, [1200, wrappedSnapHeight(view)]);
	assert.equal(review(SINCE_2025, { requested: "2025" }).year, 2026);
	assert.equal(review(SINCE_2025, { requested: "2024" }).year, 2026);
	assert.equal(review(SINCE_2025, { phase: "open" }).soFar, true);
	assert.equal(
		review(SINCE_2025, { phase: "open", requested: "2025" }).soFar,
		true,
	);
});

test("a history that starts inside the year counts from the next day in the range and the note alike", () => {
	const data = history(
		{
			"A.0": {
				IN: [
					[95, 950000, "2026-03-10T02:00:00Z", false],
					[97, 970000, "2026-03-12T04:00:00Z", false],
				],
			},
		},
		[
			["2026-03-10T02:00:00Z", 14],
			["2026-03-12T04:00:00Z", 14.2],
		],
	);
	const view = review(data);
	assert.equal(view.state, "ok");
	assert.deepEqual(view.years, [2026]);
	assert.equal(view.range, "March 11, 2026 to March 12, 2026, China time");
	assert.equal(
		view.note,
		`${fill(toolsEn.wrapped.baseline, { day: "March 11, 2026" })} ${toolsEn.wrapped.note}`,
	);
	assert.ok(!`${view.range} ${view.note}`.includes("March 10"));
	for (const locale of ["zh", "ja"] as const) {
		const day = formatDay("2026-03-11", locale);
		const other = review(data, { locale });
		assert.ok(other.range.startsWith(day));
		assert.ok(other.note.includes(day));
		assert.ok(!other.note.includes("。 "));
	}
});

test("a manual profile gets the manual message and no tiles", () => {
	const view = review(EMPTY, { manual: true });
	assert.equal(view.state, "manual");
	assert.equal(view.message, toolsEn.wrapped.manual);
	assert.deepEqual(view.tiles, []);
	assert.deepEqual(view.years, [2026]);
});

test("a year without rows says so", () => {
	const view = review(
		history({
			"A.0": {
				IN: [
					[95, 950000, "2025-03-01T04:00:00Z", false],
					[97, 970000, "2025-06-01T04:00:00Z", false],
				],
			},
		}),
	);
	assert.equal(view.state, "none");
	assert.equal(view.message, fill(toolsEn.wrapped.none, { year: 2026 }));
	assert.deepEqual(view.tiles, []);
	assert.deepEqual(view.years, [2026]);
	assert.deepEqual(review(EMPTY).years, [2026]);
});

test("on the image a long song name is cut and the level and constant stay", () => {
	const view = review(
		history({
			"L.0": {
				IN: [
					[96, 960000, "2025-06-01T04:00:00Z", false],
					[98, 980000, "2026-04-01T04:00:00Z", false],
				],
				AT: [
					[99, 995000, "2025-06-01T04:00:00Z", false],
					[100, 1000000, "2026-05-01T04:00:00Z", true],
				],
			},
		}),
	);
	const html = wrappedSnapHtml({
		brand: "PhiBot",
		host: "example.test",
		title: "2026 in review",
		player: "Player",
		meta: "",
		accent: "#fff",
		range: view.range,
		tiles: view.tiles,
		message: view.message,
		note: view.note,
	});
	assert.ok(html.includes("IN 15.0 · 96.00% → 98.00%"));
	assert.ok(html.includes("Hardest: AT 16.0 An Unbelievably"));
	assert.match(html, /<div class="tile-value">An Unbelievably[^<]*…<\/div>/);
	assert.ok(!html.includes(LONG));
});

const MARKED = history(
	{
		"A.0": {
			IN: [
				[95, 950000, "2025-06-01T04:00:00Z", false],
				[97, 970000, "2026-03-01T04:00:00Z", false],
			],
		},
		"L.0": {
			IN: [
				[96, 960000, "2025-06-01T04:00:00Z", false],
				[98, 980000, "2026-04-01T04:00:00Z", false],
			],
			AT: [
				[99, 995000, "2025-06-01T04:00:00Z", false],
				[100, 1000000, "2026-05-01T04:00:00Z", true],
			],
		},
	},
	[
		["2025-06-01T04:00:00Z", 14.5],
		["2026-03-01T04:00:00Z", 14.6],
		["2026-05-01T04:00:00Z", 14.9],
	],
);

const jacketFor = (id: string) => `https://example.test/${id}.jpg`;

const replayOf = (
	data: History,
	jacketOf?: (id: string) => string | undefined,
	manual = false,
) =>
	shown(
		reviewView({
			phase: "complete",
			locale: "en",
			requested: null,
			manual,
			history: data,
			list,
			...(jacketOf ? { jacketOf } : {}),
		}),
	);

test("an ok view carries a replay that ends on the same days as the tiles", () => {
	const view = replayOf(MARKED);
	assert.equal(view.state, "ok");
	assert.ok(view.replay);
	assert.equal(view.replay.days.length, Number(view.tiles[3]!.value));
	assert.equal(view.replay.first, "2026-01-01");
	assert.equal(view.replay.last, "2026-05-01");
	assert.equal(view.replay.startRks, 14.5);
	assert.equal(view.replay.rks.at(-1)?.value, 14.9);
	assert.deepEqual(view.replay.marks.map((m) => m.kind).sort(), [
		"ap",
		"fc",
		"jump",
		"step",
	]);
	const mark = (kind: string) =>
		view.replay!.marks.find((m) => m.kind === kind)!;
	assert.equal(mark("jump").day, "2026-05-01");
	assert.equal(mark("jump").value, view.tiles[6]!.value);
	assert.equal(mark("ap").day, "2026-05-01");
	assert.equal(mark("ap").label, toolsEn.wrapped.ap);
	assert.equal(mark("ap").value, LONG);
	assert.equal(mark("ap").sub, "AT 16.0");
	assert.equal(mark("fc").label, toolsEn.wrapped.fc);
	assert.equal(mark("step").day, "2026-04-01");
	assert.equal(mark("step").label, toolsEn.wrapped.mostImproved);
	assert.equal(mark("step").value, view.tiles[7]!.value);
	assert.equal(mark("step").sub, view.tiles[7]!.sub);
	assert.equal(view.pgti, null);
});

test("each mark carries the headline figure of its card, taken from the same facts as its tile", () => {
	const view = replayOf(MARKED);
	assert.ok(view.replay);
	const mark = (kind: string) =>
		view.replay!.marks.find((m) => m.kind === kind)!;
	assert.equal(mark("jump").big, "+0.3000");
	assert.ok(view.tiles[6]!.sub.startsWith(mark("jump").big));
	assert.equal(mark("ap").big, view.tiles[4]!.value);
	assert.equal(mark("ap").big, "1");
	assert.equal(mark("fc").big, view.tiles[5]!.value);
	assert.equal(mark("step").big, "98.00%");
	assert.ok(view.tiles[7]!.sub.endsWith(mark("step").big));
	assert.deepEqual(mark("step").acc, { before: 96, after: 98 });
	for (const kind of ["jump", "ap", "fc"])
		assert.equal("acc" in mark(kind), false);
});

test("a jacket link goes on the chart marks and not on the jump", () => {
	const view = replayOf(MARKED, jacketFor);
	assert.ok(view.replay);
	for (const m of view.replay.marks) {
		if (m.kind === "jump") assert.equal("jacket" in m, false);
		else assert.equal(m.jacket, jacketFor("L.0"));
	}
	const some = replayOf(MARKED, (id) =>
		id === "A.0" ? jacketFor(id) : undefined,
	);
	assert.ok(some.replay);
	assert.equal(some.replay.marks.filter((m) => "jacket" in m).length, 0);
	const bare = replayOf(MARKED);
	assert.ok(bare.replay);
	assert.equal(bare.replay.marks.length, 4);
	assert.equal(bare.replay.marks.filter((m) => "jacket" in m).length, 0);
});

test("a view without a timeline carries no replay and no player type", () => {
	const none = review(
		history({
			"A.0": {
				IN: [
					[95, 950000, "2025-03-01T04:00:00Z", false],
					[97, 970000, "2025-06-01T04:00:00Z", false],
				],
			},
		}),
	);
	assert.equal(none.state, "none");
	assert.equal(none.replay, null);
	assert.equal(none.pgti, null);
	const empty = review(EMPTY);
	assert.equal(empty.replay, null);
	assert.equal(empty.pgti, null);
	for (const data of [EMPTY, MARKED]) {
		const manual = replayOf(data, jacketFor, true);
		assert.equal(manual.state, "manual");
		assert.equal(manual.replay, null);
		assert.equal(manual.pgti, null);
	}
});

test("with ten or more charts the view carries a player type from the catalog", () => {
	const songs: ChartSummary[] = Array.from({ length: 12 }, (_, i) => ({
		id: `P${i}.0`,
		song: `Song ${i}`,
		composer: "",
		charts: { IN: [13, 800] },
	}));
	const extra: ChartSummary[] = [
		{
			id: "G.0",
			song: "Gone",
			composer: "",
			charts: { IN: [13, 800] },
			gone: true,
		},
		{
			id: "S.0",
			song: "Special",
			composer: "",
			charts: { IN: [5, 800], SP: [13, 800] },
		},
	];
	const scoreHistory: SaveHistory["scoreHistory"] = Object.fromEntries(
		songs.map((song) => [
			song.id,
			{
				IN: [
					[95, 950000, "2025-06-01T04:00:00Z", false],
					[98, 980000, "2026-03-01T04:00:00Z", false],
				],
			},
		]),
	);
	const view = shown(
		reviewView({
			phase: "complete",
			locale: "en",
			requested: null,
			manual: false,
			history: history(scoreHistory, [
				["2025-06-01T04:00:00Z", 14],
				["2026-03-01T04:00:00Z", 14.2],
			]),
			list: [...songs, ...extra],
		}),
	);
	assert.equal(view.state, "ok");
	assert.ok(view.pgti);
	assert.match(view.pgti.code, /^[PR][EF][SW][MB]$/);
	assert.equal(view.pgti.aim.letter, "P");
	assert.equal(view.pgti.range.total, 13);
	assert.equal(view.pgti.range.played, 12);
	assert.equal(view.pgti.range.letter, "E");
	assert.deepEqual([view.pgti.pace.months, view.pgti.pace.total], [1, 3]);
	assert.ok(view.replay);
});

test("a record on a song that has left the list never makes played exceed the total", () => {
	const songs: ChartSummary[] = Array.from({ length: 10 }, (_, i) => ({
		id: `P${i}.0`,
		song: `Song ${i}`,
		composer: "",
		charts: { IN: [13, 800] },
	}));
	const gone: ChartSummary = {
		id: "G.0",
		song: "Gone",
		composer: "",
		charts: { IN: [13, 800] },
		gone: true,
	};
	const scoreHistory: SaveHistory["scoreHistory"] = Object.fromEntries(
		[...songs, gone].map((song) => [
			song.id,
			{
				IN: [
					[95, 950000, "2025-06-01T04:00:00Z", false],
					[98, 980000, "2026-03-01T04:00:00Z", false],
				],
			},
		]),
	);
	const view = shown(
		reviewView({
			phase: "complete",
			locale: "en",
			requested: null,
			manual: false,
			history: history(scoreHistory, [
				["2025-06-01T04:00:00Z", 14],
				["2026-03-01T04:00:00Z", 14.2],
			]),
			list: [...songs, gone],
		}),
	);
	assert.ok(view.pgti);
	assert.equal(view.pgti.range.played, 11);
	assert.ok(view.pgti.range.played <= view.pgti.range.total);
	assert.equal(view.pgti.range.total, 11);
});

test("the image carries the player type when there is one and grows by its band", () => {
	const base = {
		brand: "PhiBot",
		host: "example.test",
		title: "2026 Recap",
		player: "Player",
		meta: "",
		accent: "#fff",
		range: "range",
		tiles: [{ label: "RKS", value: "14.0000", sub: "" }],
		message: "",
		note: "note",
	};
	const plain = wrappedSnapHtml(base);
	assert.ok(!plain.includes('class="pgti"'));
	const typed = wrappedSnapHtml({
		...base,
		pgti: {
			label: "PGTI",
			letters: ["P", "E", "S", "M"],
			suffix: "G",
			name: "The <Cartographer>",
			groups: "Collectors · Clockwork",
		},
	});
	assert.match(typed, /class="pgti"/);
	assert.equal(typed.match(/class="pgti-l"/g)?.length, 4);
	assert.match(typed, /class="pgti-l pgti-s">G</);
	assert.match(typed, /The &lt;Cartographer&gt;/);
	assert.match(typed, /Collectors · Clockwork/);
	const bare = wrappedSnapHtml({
		...base,
		pgti: { label: "PGTI", letters: ["R"], name: "N", groups: "G" },
	});
	assert.ok(!bare.includes('class="pgti-dash"'));
	assert.ok(wrappedSnapHeight(base, true) > wrappedSnapHeight(base));
	assert.equal(
		wrappedSnapHeight({ tiles: [] }, true),
		wrappedSnapHeight({ tiles: [] }),
	);
});
