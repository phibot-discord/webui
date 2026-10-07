import assert from "node:assert/strict";
import test from "node:test";
import { searchCharts } from "./chart-catalog";
import { fuzzyFold, looseFold, rankSongs } from "./song-search";

const SONGS = [
	{
		id: "AbsoluTedisoRdeR.AcuteDisarray.0",
		song: "AbsoluTe disoRdeR",
		composer: "Acute Disarray",
		aliases: ["ATRR", "挨踢啊啊", "Ad", "绝对混乱"],
	},
	{
		id: "Adastraperaspera.RabbitHouse.0",
		song: "Ad astra per aspera",
		composer: "Rabbit House",
		aliases: ["太阳", "氦闪", "循此苦旅 直抵群星", "广告", "Ad"],
	},
	{
		id: "AfterDawn.S9ryne.0",
		song: "After Dawn",
		composer: "S9ryne",
		aliases: ["AD", "黎明之后", "广告"],
	},
	{
		id: "000AinSophAur.Yumeji.0",
		song: "000 -Ain Soph Aur-",
		composer: "Yumeji",
		aliases: ["OOO", "000", "Ain Soph Aur", "无限光", "无限之光", "ASA"],
	},
	{
		id: "70MinutesFighters.かたぎり.0",
		song: "70 Minutes Fighters",
		composer: "かたぎり",
		aliases: ["70分", "70min", "70MF", "70", "＞w＜", ">w<"],
	},
	{
		id: "祈-我ら神祖と共に歩む者なり-.光吉猛修VS穴山大輔VSKaiVS水野健治VS大国奏音.0",
		song: "祈 -我ら神祖と共に歩む者なり-",
		composer: "光吉猛修 VS 穴山大輔 VS Kai VS 水野健治 VS 大国奏音",
		aliases: ["神祖", "祈", "7", "Inori"],
	},
	{
		id: "狂喜蘭舞.LeaF.0",
		song: "狂喜蘭舞",
		composer: "LeaF",
		aliases: ["狂喜", "狂喜兰舞", "kxlw"],
	},
	{
		id: "FixationsTowardtheStars.Foodbot.0",
		song: "Fixations Toward the Stars",
		composer: "Foodbot",
		aliases: ["ftts", "恋恋群星"],
	},
	{ id: "Igallta.SeURa.0", song: "Igallta", composer: "Se-U-Ra" },
	{ id: "Rrharil.TeamGrimoire.0", song: "Rrhar'il", composer: "Team Grimoire" },
	{ id: "RabbitHole.Test.0", song: "Rabbit Hole", composer: "Moonlight Choir" },
	{ id: "MoonlightSonata.Test.0", song: "Moonlight Sonata", composer: "Test" },
	{ id: "WATER.Test.0", song: "WATER", composer: "Test", aliases: ["wtr"] },
	{
		id: "DiamondDust.MasahiroGodspeedAoki.0",
		song: "Diamond Dust",
		composer: "Masahiro “Godspeed” Aoki",
	},
	{
		id: "SATELLITE.かめりあ.0",
		song: "S.A.T.E.L.L.I.T.E.",
		composer: "かめりあ",
	},
	{
		id: "ERABYECONNEC10N.かめりあ.0",
		song: "+ERABY+E CONNEC+10N",
		composer: "かめりあ",
		aliases: ["+E"],
	},
];

function ids(q: string, opts?: { limit?: number; exact?: boolean }) {
	return rankSongs(SONGS, q, opts).map((m) => m.song.id);
}

test("folds keep full-width symbols exact but strip punctuation for fuzzy tiers", () => {
	assert.equal(looseFold("＞w＜"), ">w<");
	assert.equal(looseFold(" Ain  Soph "), "ainsoph");
	assert.equal(fuzzyFold(">w<"), "w");
	assert.equal(fuzzyFold("Rrhar'il"), "rrharil");
});

test("ad matches three songs by exact alias, title order breaking the tie", () => {
	const hits = rankSongs(SONGS, "ad");
	assert.deepEqual(
		hits.slice(0, 3).map((m) => [m.song.song, m.tier, m.via.kind]),
		[
			["AbsoluTe disoRdeR", 0, "alias"],
			["Ad astra per aspera", 0, "alias"],
			["After Dawn", 0, "alias"],
		],
	);
	assert.equal(hits[2]?.via.text, "AD");
	assert.deepEqual(ids("ad", { exact: true }).length, 3);
});

test("aliases match case-insensitively and report the stored casing", () => {
	for (const q of ["ASA", "asa", " asa "]) {
		const [first] = rankSongs(SONGS, q);
		assert.equal(first?.song.id, "000AinSophAur.Yumeji.0");
		assert.equal(first?.tier, 0);
		assert.deepEqual(first?.via, { kind: "alias", text: "ASA" });
	}
	assert.equal(
		rankSongs(SONGS, "无限光")[0]?.song.id,
		"000AinSophAur.Yumeji.0",
	);
});

test("full-width ＞w＜ is an exact alias, not a search for w", () => {
	for (const q of ["＞w＜", ">w<"]) {
		const hits = rankSongs(SONGS, q);
		assert.equal(hits[0]?.song.id, "70MinutesFighters.かたぎり.0");
		assert.equal(hits[0]?.tier, 0);
		assert.deepEqual(ids(q), ["70MinutesFighters.かたぎり.0"]);
	}
	// Typed on its own, w is an ordinary prefix and ＞w＜ is not a w
	assert.ok(ids("w").includes("WATER.Test.0"));
	assert.equal(ids("w").includes("70MinutesFighters.かたぎり.0"), false);
	// +E is not an e either: only the title's prefix counts, at its length
	const plusE = rankSongs(SONGS, "e").find(
		(m) => m.song.id === "ERABYECONNEC10N.かめりあ.0",
	);
	assert.equal(plusE?.via.kind, "title");
	assert.ok((plusE?.score ?? 1) < 0.5);
	assert.equal(rankSongs(SONGS, "+e")[0]?.tier, 0);
	// Mostly-punctuation input matches as typed in the lower tiers too
	assert.deepEqual(ids(">w"), ["70MinutesFighters.かたぎり.0"]);
	assert.equal(rankSongs(SONGS, ">w")[0]?.tier, 1);
});

test("dotted titles still fold for prefix matching", () => {
	const [hit] = rankSongs(SONGS, "satell");
	assert.equal(hit?.song.id, "SATELLITE.かめりあ.0");
	assert.equal(hit?.tier, 1);
	assert.equal(hit?.via.kind, "title");
});

test("punctuation in an ordinary query is ignored for prefix and fuzzy", () => {
	const [prefix] = rankSongs(SONGS, "Rrhar'");
	assert.equal(prefix?.song.id, "Rrharil.TeamGrimoire.0");
	assert.equal(prefix?.tier, 1);
	const [typo] = rankSongs(SONGS, "rrhar-ill");
	assert.equal(typo?.song.id, "Rrharil.TeamGrimoire.0");
	assert.equal(typo?.tier, 4);
});

test("70 finds 70 Minutes Fighters and never the song aliased 7", () => {
	const hits = ids("70");
	assert.equal(hits[0], "70MinutesFighters.かたぎり.0");
	assert.equal(
		hits.some((id) => id.startsWith("祈")),
		false,
	);
	assert.equal(ids("7")[0]?.startsWith("祈"), true);
});

test("simplified spelling reaches the traditional title through an alias", () => {
	const [first] = rankSongs(SONGS, "狂喜兰舞");
	assert.equal(first?.song.id, "狂喜蘭舞.LeaF.0");
	assert.equal(first?.tier, 0);
	assert.equal(first?.via.text, "狂喜兰舞");
});

test("ain soph is a prefix of an alias and beats the title contains", () => {
	const [first] = rankSongs(SONGS, "ain soph");
	assert.equal(first?.song.id, "000AinSophAur.Yumeji.0");
	assert.equal(first?.tier, 1);
	assert.deepEqual(first?.via, { kind: "alias", text: "Ain Soph Aur" });
	assert.deepEqual(ids("ain soph", { exact: true }), []);
});

test("ids match with and without the .0 suffix", () => {
	for (const q of ["Igallta.SeURa", "igallta.seura.0"]) {
		const [first] = rankSongs(SONGS, q);
		assert.equal(first?.song.id, "Igallta.SeURa.0");
		assert.equal(first?.tier, 0);
		assert.equal(first?.via.kind, "id");
	}
});

test("title prefix ranks above composer matches; ids only match exactly", () => {
	assert.deepEqual(
		rankSongs(SONGS, "rabbit").map((m) => [m.song.song, m.tier, m.via.kind]),
		[
			["Rabbit Hole", 1, "title"],
			["Ad astra per aspera", 3, "composer"],
		],
	);
	assert.equal(
		rankSongs(SONGS, "Igallta.Se").some((m) => m.via.kind === "id"),
		false,
	);
	assert.deepEqual(
		rankSongs(SONGS, "moonlight").map((m) => [m.song.song, m.tier]),
		[
			["Moonlight Sonata", 1],
			["Rabbit Hole", 3],
		],
	);
});

test("composers match in the composer tier, Latin names at a word start", () => {
	const kamome = rankSongs(SONGS, "かめりあ");
	assert.deepEqual(
		kamome.map((m) => [m.song.id, m.tier, m.via.kind]),
		[
			["ERABYECONNEC10N.かめりあ.0", 3, "composer"],
			["SATELLITE.かめりあ.0", 3, "composer"],
		],
	);
	// Diamond Dust's id and composer hold "Masahiro", which contains "asa"
	assert.equal(
		ids("asa").includes("DiamondDust.MasahiroGodspeedAoki.0"),
		false,
	);
	for (const q of ["godspeed", "Aoki", "godspeed aoki"]) {
		const [hit] = rankSongs(SONGS, q);
		assert.equal(hit?.song.id, "DiamondDust.MasahiroGodspeedAoki.0", q);
		assert.equal(hit?.tier, 3, q);
	}
	assert.equal(
		rankSongs(SONGS, "穴山")[0]?.song.song,
		"祈 -我ら神祖と共に歩む者なり-",
	);
});

test("a title matching in the same tier is reported over a nickname", () => {
	const absolute = rankSongs(SONGS, "a").find(
		(m) => m.song.id === "AbsoluTedisoRdeR.AcuteDisarray.0",
	);
	assert.equal(absolute?.tier, 1);
	assert.deepEqual(absolute?.via, { kind: "title", text: "AbsoluTe disoRdeR" });
});

test("alias contains needs two characters; titles and fuzzy rules still apply", () => {
	assert.deepEqual(ids("限"), []);
	const [hit] = rankSongs(SONGS, "限光");
	assert.equal(hit?.song.id, "000AinSophAur.Yumeji.0");
	assert.equal(hit?.tier, 2);
	// Both contain 群星; the shorter alias covers more of itself and ranks first
	assert.deepEqual(ids("群星"), [
		"FixationsTowardtheStars.Foodbot.0",
		"Adastraperaspera.RabbitHouse.0",
	]);
	assert.equal(ids("rrharil")[0], "Rrharil.TeamGrimoire.0");
	const typo = rankSongs(SONGS, "igalta");
	assert.equal(typo[0]?.song.id, "Igallta.SeURa.0");
	assert.equal(typo[0]?.tier, 4);
	assert.deepEqual(ids("鸽游"), []);
	assert.deepEqual(ids("   "), []);
});

test("one result per song, limit respected", () => {
	const hits = ids("a", { limit: 2 });
	assert.equal(hits.length, 2);
	const all = ids("a", { limit: 50 });
	assert.equal(new Set(all).size, all.length);
});

test("searchCharts wraps rankSongs for existing callers", () => {
	const list = SONGS.map(({ id, song, composer, aliases }) => ({
		id,
		song,
		composer,
		...(aliases ? { aliases } : {}),
		charts: {},
	}));
	assert.deepEqual(
		searchCharts(list, "ad").map((s) => s.song),
		["AbsoluTe disoRdeR", "Ad astra per aspera", "After Dawn"],
	);
	assert.equal(searchCharts(list, "a", 1).length, 1);
});
