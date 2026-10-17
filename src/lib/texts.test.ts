import assert from "node:assert/strict";
import test from "node:test";
import {
	avatarKey,
	keyed,
	linesIn,
	parseAvatarFiles,
	parseTextSection,
	parseTextsIndex,
	parseTextsSection,
	parseTips,
	type TextLine,
	textAnchor,
	tipsIn,
} from "./texts";

test("tips are read per game language and fall back to Simplified Chinese", () => {
	const lists = parseTips({
		v: 1,
		langs: { "zh-CN": ["!!", "咕咕"], en: ["!!", " ", 3, "Coo"], fr: ["x"] },
	});
	assert.ok(lists);
	assert.deepEqual(lists.get("en"), ["!!", "Coo"]);
	assert.equal(lists.has("ja"), false);
	assert.deepEqual(tipsIn(lists, "ja"), {
		lang: "zh-CN",
		tips: ["!!", "咕咕"],
	});
	assert.deepEqual(tipsIn(lists, "en")?.lang, "en");
	assert.equal(parseTips({ v: 2, langs: {} }), undefined);
	assert.equal(parseTips({ v: 1, langs: { en: [] } }), undefined);
	assert.equal(tipsIn(new Map(), "en"), undefined);
});

test("an unknown section opens the tips", () => {
	assert.equal(parseTextSection("tips"), "tips");
	assert.equal(parseTextSection("nope"), "tips");
	assert.equal(parseTextSection(undefined), "tips");
});

test("a section's groups keep only well-formed lines and images", () => {
	const groups = parseTextsSection({
		v: 1,
		groups: [
			{
				id: "a",
				title: { zh: "甲", en: "A" },
				note: null,
				lines: [
					{ "zh-CN": "面对它", en: "Face it", fr: "x" },
					{ text: "CONTENT" },
					{ text: "Tap", lang: "en" },
					{ nope: 1 },
				],
				images: [
					{ file: "texts/images/a-0.png", width: 2, height: 3 },
					{ file: "../x.png", width: 2, height: 3 },
				],
			},
			{ id: "empty", title: { zh: "空" }, lines: [] },
			{ title: { zh: "无 id" }, lines: [{ text: "x" }] },
		],
	});
	assert.ok(groups);
	assert.equal(groups.length, 1);
	assert.deepEqual(groups[0]?.title, { zh: "甲", en: "A" });
	assert.equal(groups[0]?.lines.length, 3);
	assert.deepEqual(groups[0]?.images, [
		{ file: "texts/images/a-0.png", width: 2, height: 3 },
	]);
	assert.equal(parseTextsSection({ v: 2, groups: [] }), undefined);
});

test("lines show in the picked language, falling back the way the game would", () => {
	const lines: TextLine[] = [
		{ kind: "langs", text: { "zh-CN": "面对它", en: "Face it" } },
		{ kind: "text", text: "Tap", lang: "en" },
		{ kind: "text", text: "点击", lang: "zh-CN" },
		{ kind: "text", text: "CONTENT" },
	];
	assert.deepEqual(linesIn(lines, "en"), [
		{ text: "Face it", lang: "en" },
		{ text: "Tap", lang: "en" },
		{ text: "CONTENT", lang: undefined },
	]);
	assert.deepEqual(linesIn(lines, "ja"), [
		{ text: "面对它", lang: "zh-CN" },
		{ text: "点击", lang: "zh-CN" },
		{ text: "CONTENT", lang: undefined },
	]);
});

test("the index lists the published sections in their two site languages", () => {
	const rows = parseTextsIndex({
		v: 1,
		sections: [
			{
				id: "story",
				title: { zh: "剧情", en: "Story" },
				lede: { zh: "z" },
				lines: 38,
			},
			{ id: "tips", title: { zh: "x" } },
			{ id: "nope", title: { zh: "x" } },
		],
		pv: [
			{ clip: "qd", section: "story", group: "qd", chapter: "c8" },
			{ clip: "qd", section: "story", group: "later" },
			{ clip: "x", section: "tips", group: "g" },
			{ clip: "y", section: "story" },
			{ clip: "z", section: "story", group: "n", chapter: "c3" },
		],
	});
	assert.deepEqual(
		[...(rows?.transcripts ?? [])],
		[
			["qd", { group: "qd", chapter: "c8" }],
			["x", { group: "g", chapter: undefined }],
			["z", { group: "n", chapter: "c3" }],
		],
		"each caption row names its group's chapter",
	);
	assert.equal(textAnchor("il2cpp.QD/<Start>d__5"), "t-il2cpp-QD-Start-d__5");
	assert.equal(parseTextSection("credits"), "credits");
	assert.equal(parseTextSection("story"), "tips");
	assert.equal(parseTextSection("avatars"), "avatars");
});

test("repeated lines still get unique keys", () => {
	assert.deepEqual(
		keyed(["a", "b", "a"], (s) => s).map((k) => k.key),
		["a", "b", "a\u00001"],
	);
});

test("an avatar's file follows its addressable key when the name cannot be a file name", () => {
	const files = parseAvatarFiles([
		{ addressable_key: "avatar.Glaciaxion", name: "Glaciaxion" },
		{ addressable_key: "avatar.Cipher1", name: "Cipher : /2&//<|0" },
		{ addressable_key: "avatar.a/b", name: "Bad" },
		{ name: "No key" },
		null,
	]);
	assert.ok(files);
	assert.equal(
		avatarKey("Cipher : /2&//<|0", files),
		"html/avatar/Cipher1.png",
	);
	assert.equal(avatarKey("Glaciaxion", files), "html/avatar/Glaciaxion.png");
	assert.equal(avatarKey("Bad", files), "html/avatar/Bad.png");
	assert.equal(avatarKey("Unlisted", new Map()), "html/avatar/Unlisted.png");
	assert.equal(parseAvatarFiles({}), undefined);
	assert.equal(parseAvatarFiles([]), undefined);
});
