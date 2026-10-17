import assert from "node:assert/strict";
import test from "node:test";
import {
	noteTotal,
	parseHiddenSong,
	unlockChapter,
	unlocksHiddenSong,
} from "./c9s6";
import type { CollectionIndex } from "./collection";

function line(en: string, zh: string) {
	return { en, ja: `${en}（ja）`, ko: `${en} (ko)`, "zh-CN": zh, "zh-TW": zh };
}

const MANIFEST = {
	background: { file: "c9s6/background.png", height: 135, width: 256 },
	chart: {
		bpm: 175,
		file: "c9s6/chart.json",
		lines: 24,
		notes: { drag: 262, flick: 46, hold: 35, tap: 115 },
	},
	cutscene: {
		fadeToWhite: { autoNext: true, in: 0.5, line: 0, out: 0.5, page: 2 },
		image: {
			entrance: 2,
			file: "collection-art/blackhole0.jpg",
			height: 1152,
			original: "collection-art/blackhole0.png",
			page: 1,
			width: 2048,
		},
		pages: [
			{ lines: [line("The black hole came.", "黑洞来了。")] },
			{ lines: [line("Gino: Go!", "Gino：快走！"), line("", "")] },
			{ lines: [line("I'll find you!", "我会来找你的！")] },
			{ lines: [line("Item collected", "获得收藏品")] },
		],
		sound: {
			bgm: "c9s6/cutscene-bgm.ogg",
			image: "c9s6/cutscene-image.ogg",
			typing: ["c9s6/cutscene-typing.ogg"],
		},
		video: {
			fadeIn: 1.5,
			file: "c9s6/loop.mp4",
			fps: 30,
			frames: 270,
			height: 1080,
			width: 1920,
		},
	},
	difficulty: "?",
	level: "SP",
	music: { file: "c9s6/music.ogg" },
	name: "C9S6",
	pack: { file: "c9s6/C9S6-SP.pez" },
	v: 1,
};

type Manifest = typeof MANIFEST;
type Cut = Manifest["cutscene"];

const parse = (over: Partial<Manifest>) =>
	parseHiddenSong({ ...MANIFEST, ...over });
const cut = (over: Partial<Cut>) =>
	parse({ cutscene: { ...MANIFEST.cutscene, ...over } })?.cutscene;

test("the hidden song manifest is read whole", () => {
	const song = parseHiddenSong(MANIFEST);
	assert.ok(song);
	assert.equal(song.name, "C9S6");
	assert.equal(song.level, "SP");
	assert.equal(song.difficulty, "?");
	assert.deepEqual(song.chart, {
		file: "c9s6/chart.json",
		lines: 24,
		bpm: 175,
		notes: { tap: 115, drag: 262, hold: 35, flick: 46 },
	});
	assert.equal(song.chart?.notes && noteTotal(song.chart.notes), 458);
	assert.equal(song.music, "c9s6/music.ogg");
	assert.equal(song.pack, "c9s6/C9S6-SP.pez");
	assert.deepEqual(song.background, {
		file: "c9s6/background.png",
		width: 256,
		height: 135,
	});
	const scene = song.cutscene;
	assert.ok(scene);
	assert.equal(scene.pages.length, 4);
	assert.deepEqual(scene.pages[1]?.lines[1], {
		"zh-CN": "",
		"zh-TW": "",
		en: "",
		ja: "（ja）",
		ko: " (ko)",
	});
	assert.deepEqual(scene.image, {
		page: 1,
		entrance: 2,
		file: "collection-art/blackhole0.jpg",
		original: "collection-art/blackhole0.png",
		width: 2048,
		height: 1152,
	});
	assert.deepEqual(scene.video, {
		file: "c9s6/loop.mp4",
		width: 1920,
		height: 1080,
		fps: 30,
		frames: 270,
		fadeIn: 1.5,
	});
	assert.deepEqual(scene.fadeToWhite, {
		page: 2,
		line: 0,
		in: 0.5,
		out: 0.5,
		autoNext: true,
	});
	assert.deepEqual(scene.sound, {
		bgm: "c9s6/cutscene-bgm.ogg",
		image: "c9s6/cutscene-image.ogg",
		typing: ["c9s6/cutscene-typing.ogg"],
	});
});

test("an unknown version or a body that is not an object is unusable", () => {
	assert.equal(parseHiddenSong(null), undefined);
	assert.equal(parseHiddenSong("C9S6"), undefined);
	assert.equal(parseHiddenSong([]), undefined);
	assert.equal(parseHiddenSong({ ...MANIFEST, v: 2 }), undefined);
	assert.equal(parseHiddenSong({ ...MANIFEST, v: "1" }), undefined);
	const { v: _, ...unversioned } = MANIFEST;
	assert.equal(parseHiddenSong(unversioned), undefined);
});

test("missing labels fall back instead of dropping the song", () => {
	const song = parseHiddenSong({ v: 1 });
	assert.deepEqual(song, {
		name: "C9S6",
		level: "?",
		difficulty: "?",
		chart: null,
		music: null,
		background: null,
		pack: null,
		cutscene: null,
	});
	assert.equal(parse({ level: " " })?.level, "?");
	assert.equal(parse({ name: 7 as unknown as string })?.name, "C9S6");
});

test("files outside c9s6/ or with the wrong kind are dropped one at a time", () => {
	const bad = [
		"collection/music.ogg",
		"c9s6/../music.ogg",
		"c9s6/sub/music.ogg",
		"/c9s6/music.ogg",
		"c9s6/music.mp3",
		"c9s6/.ogg",
		"https://example.test/c9s6/music.ogg",
	];
	for (const file of bad) {
		const song = parse({ music: { file } });
		assert.equal(song?.music, null, file);
		assert.equal(song?.pack, "c9s6/C9S6-SP.pez", file);
	}
	assert.equal(parse({ pack: { file: "c9s6/C9S6-SP.zip" } })?.pack, null);
	assert.equal(parse({ pack: { file: "phira/SP/C9S6-SP.pez" } })?.pack, null);
	assert.equal(
		parse({ music: "c9s6/music.ogg" as unknown as Manifest["music"] })?.music,
		null,
	);
	assert.equal(
		parse({ chart: { ...MANIFEST.chart, file: "c9s6/chart.ogg" } })?.chart,
		null,
	);
	assert.equal(
		parse({
			background: { ...MANIFEST.background, file: "c9s6/background.jpg" },
		})?.background,
		null,
	);
});

test("sizes and counts must be whole numbers, and a bad one only hides its part", () => {
	assert.equal(
		parse({ background: { ...MANIFEST.background, width: 256.5 } })?.background,
		null,
	);
	assert.equal(
		parse({ background: { ...MANIFEST.background, height: 0 } })?.background,
		null,
	);
	const chart = (over: Record<string, unknown>) =>
		parse({ chart: { ...MANIFEST.chart, ...over } })?.chart;
	assert.equal(chart({ lines: 24.5 })?.lines, null);
	assert.equal(chart({ lines: "24" })?.lines, null);
	assert.equal(chart({ bpm: 0 })?.bpm, null);
	assert.equal(chart({ bpm: 172.5 })?.bpm, 172.5);
	assert.equal(
		chart({ notes: { ...MANIFEST.chart.notes, tap: 1.5 } })?.notes,
		null,
	);
	assert.equal(
		chart({ notes: { ...MANIFEST.chart.notes, hold: -1 } })?.notes,
		null,
	);
	assert.deepEqual(
		chart({ notes: { tap: 0, drag: 0, hold: 0, flick: 0 } })?.notes,
		{
			tap: 0,
			drag: 0,
			hold: 0,
			flick: 0,
		},
	);
	assert.equal(chart({ lines: 24.5 })?.file, "c9s6/chart.json");
	const video = (over: Record<string, unknown>) =>
		cut({ video: { ...MANIFEST.cutscene.video, ...over } })?.video;
	assert.equal(video({ width: 1920.5 }), null);
	assert.equal(video({ frames: 0 }), null);
	assert.equal(video({ fps: 0 }), null);
	assert.equal(video({ fadeIn: -1 }), null);
	assert.equal(video({ file: "pv/video/loop.mp4" }), null);
	assert.equal(video({ fps: 29.97 })?.fps, 29.97);
	assert.ok(cut({ video: null as unknown as Cut["video"] }));
});

test("the cutscene illustration must come from collection-art/ and start on a real page", () => {
	const image = (over: Record<string, unknown>) =>
		cut({ image: { ...MANIFEST.cutscene.image, ...over } })?.image;
	assert.equal(image({ page: 4 }), null);
	assert.equal(image({ page: -1 }), null);
	assert.equal(image({ page: 1.5 }), null);
	assert.equal(image({ page: 0 })?.page, 0);
	assert.equal(image({ file: "c9s6/blackhole0.jpg" }), null);
	assert.equal(image({ file: "collection-art/blackhole0.png" }), null);
	assert.equal(image({ original: "collection-art/blackhole0.jpg" }), null);
	assert.equal(image({ file: "collection-art/../x.jpg" }), null);
	assert.equal(image({ width: 2048.5 }), null);
	assert.equal(image({ entrance: "2" }), null);
	assert.equal(image({ entrance: 0 })?.entrance, 0);
});

test("the fade to white must point at a line that exists", () => {
	const fade = (over: Record<string, unknown>) =>
		cut({ fadeToWhite: { ...MANIFEST.cutscene.fadeToWhite, ...over } })
			?.fadeToWhite;
	assert.equal(fade({ page: 4 }), null);
	assert.equal(fade({ line: 1 }), null);
	assert.equal(fade({ page: 1, line: 1 })?.line, 1);
	assert.equal(fade({ in: -0.5 }), null);
	assert.equal(fade({ out: "0.5" }), null);
	assert.equal(fade({ autoNext: "yes" })?.autoNext, false);
});

test("a cutscene needs lines, and keeps page and line numbers when one is malformed", () => {
	assert.equal(cut({ pages: [] }), null);
	assert.equal(cut({ pages: "x" as unknown as Cut["pages"] }), null);
	assert.equal(cut({ pages: [{ lines: [] }] as Cut["pages"] }), null);
	assert.equal(parse({ cutscene: null as unknown as Cut })?.cutscene, null);
	assert.equal(
		parse({ cutscene: null as unknown as Cut })?.pack,
		"c9s6/C9S6-SP.pez",
	);
	const pages = [
		null,
		{ lines: "x" },
		{ lines: [null, { en: 5, "zh-CN": "好" }] },
		...MANIFEST.cutscene.pages,
	] as unknown as Cut["pages"];
	const scene = cut({
		pages,
		image: { ...MANIFEST.cutscene.image, page: 4 },
		fadeToWhite: { ...MANIFEST.cutscene.fadeToWhite, page: 2, line: 1 },
	});
	assert.equal(scene?.pages.length, 7);
	assert.deepEqual(scene?.pages[0], { lines: [] });
	assert.deepEqual(scene?.pages[1], { lines: [] });
	assert.equal(scene?.pages[2]?.lines.length, 2);
	assert.equal(scene?.pages[2]?.lines[0]?.en, "");
	assert.equal(scene?.pages[2]?.lines[1]?.en, "");
	assert.equal(scene?.pages[2]?.lines[1]?.["zh-CN"], "好");
	assert.equal(scene?.image?.page, 4);
	assert.equal(scene?.fadeToWhite?.line, 1);
});

test("sounds are optional and typing clips are kept in order", () => {
	const sound = (over: Record<string, unknown>) =>
		cut({ sound: { ...MANIFEST.cutscene.sound, ...over } })?.sound;
	assert.deepEqual(sound({ bgm: null, image: undefined, typing: [] }), {
		bgm: null,
		image: null,
		typing: [],
	});
	assert.deepEqual(
		sound({
			typing: [
				"c9s6/cutscene-typing-1.ogg",
				"c9s6/../x.ogg",
				7,
				"c9s6/cutscene-typing-2.ogg",
			],
		})?.typing,
		["c9s6/cutscene-typing-1.ogg", "c9s6/cutscene-typing-2.ogg"],
	);
	assert.equal(sound({ bgm: "collection/bgm.ogg" })?.bgm, null);
	assert.deepEqual(
		cut({ sound: undefined as unknown as Cut["sound"] })?.sound,
		{ bgm: null, image: null, typing: [] },
	);
});

test("only the C9S6Unlocked story flag opens the hidden song", () => {
	assert.equal(
		unlocksHiddenSong({ type: 7, info: ["C9S6Unlocked", "", ""] }),
		true,
	);
	assert.equal(
		unlocksHiddenSong({ type: 7, info: ["C9Other, C9S6Unlocked"] }),
		true,
	);
	assert.equal(unlocksHiddenSong({ type: 7, info: ["C9S6Unlock"] }), false);
	assert.equal(unlocksHiddenSong({ type: 6, info: ["C9S6Unlocked"] }), false);
	assert.equal(unlocksHiddenSong({ type: 7, info: [] }), false);
});

test("the hidden song belongs to the chapter of the entry that unlocks it", () => {
	const chapter = (id: string) => ({
		id,
		kind: "main" as const,
		name: { en: id },
		label: null,
		unlock: null,
	});
	const entry = (type: number, flag: string) => ({
		sub: 1,
		date: "",
		type,
		info: [flag, "", ""],
	});
	const index: CollectionIndex = {
		chapters: [chapter("c8"), chapter("c9")],
		items: [
			{ key: "a", chapter: "c8", entries: [entry(7, "C9Other")] },
			{
				key: "blackhole",
				chapter: "c9",
				entries: [entry(-1, ""), entry(7, "C9S6Unlocked")],
			},
		],
	};
	assert.equal(unlockChapter(index)?.id, "c9");
	assert.equal(
		unlockChapter({
			...index,
			items: index.items.map((i) => ({ ...i, chapter: null })),
		}),
		undefined,
	);
	assert.equal(
		unlockChapter({ ...index, chapters: [chapter("c8")] }),
		undefined,
	);
	assert.equal(unlockChapter({ chapters: [], items: [] }), undefined);
});
