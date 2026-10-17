import assert from "node:assert/strict";
import test from "node:test";
import {
	clipTitle,
	formatDuration,
	groupChapter,
	groupClips,
	groupLabel,
	mergeSpecials,
	type PvClip,
	parseOverlayIndex,
	parsePvManifest,
	parsePvSpecials,
} from "./pv";

function row(id: string, group: string, extra: Record<string, unknown> = {}) {
	return {
		id,
		name: id,
		group,
		scene: `Assets/${group}/${id}.unity`,
		file: `pv/video/${id}.mp4`,
		size: 1_000_000,
		width: 1920,
		height: 1080,
		fps: 30,
		frames: 900,
		duration: 30,
		audio: true,
		...extra,
	};
}

function clips(rows: ReturnType<typeof row>[]): PvClip[] {
	return parsePvManifest({ v: 1, clips: rows }) ?? [];
}

test("a manifest lists clips with their file, size and length", () => {
	const [clip] = clips([
		row("spas-unlock", "SpasmodicEvent", { name: "Spas_Unlock" }),
	]);
	assert.deepEqual(clip, {
		id: "spas-unlock",
		name: "Spas_Unlock",
		group: "SpasmodicEvent",
		scene: "Assets/SpasmodicEvent/spas-unlock.unity",
		file: "pv/video/spas-unlock.mp4",
		size: 1_000_000,
		width: 1920,
		height: 1080,
		duration: 30,
		audio: true,
	});
});

test("a bad clip is dropped and the rest still load; a bad manifest is unreadable", () => {
	assert.equal(parsePvManifest(null), undefined);
	assert.equal(parsePvManifest({ v: 2, clips: [] }), undefined);
	assert.equal(parsePvManifest({ v: 1 }), undefined);
	const list = clips([
		row("ok", "A"),
		row("Bad Id", "A"),
		row("ok", "A", { duration: 5 }),
		row("elsewhere", "A", { file: "music/elsewhere.mp4" }),
		row("other", "A", { file: "pv/video/someone-else.mp4" }),
		row("empty", "A", { size: 0 }),
		row("sizeless", "A", { width: undefined }),
		row("silent", "A", { audio: false }),
		null as never,
	]);
	assert.deepEqual(
		list.map((c) => c.id),
		["ok", "silent"],
	);
	assert.equal(list[0]?.duration, 30);
	assert.equal(list[1]?.audio, false);
});

test("a clip's game name becomes a readable title", () => {
	assert.equal(clipTitle("Spas_Unlock"), "Spas Unlock");
	assert.equal(clipTitle("ds unlockIntro_Sound"), "ds unlock Intro Sound");
	assert.equal(clipTitle("321_Unlock_Final_Plus"), "321 Unlock Final Plus");
	assert.equal(clipTitle("AfterDeductionVideo"), "After Deduction Video");
	assert.equal(clipTitle("QD"), "QD");
});

test("lengths read at a glance", () => {
	assert.equal(formatDuration(27.6), "0:28");
	assert.equal(formatDuration(351), "5:51");
	assert.equal(formatDuration(3600), "1:00:00");
	assert.equal(formatDuration(-3), "0:00");
});

const CHAPTERS = [
	{ id: "c4", unlock: null },
	{ id: "c5", unlock: "Spasmodic" },
	{ id: "c6", unlock: "Igallta" },
	{ id: "c9", unlock: null },
];

test("a group belongs to the chapter it plays in, or the one its event unlocks", () => {
	assert.equal(groupChapter("Chapter9", CHAPTERS)?.id, "c9");
	assert.equal(groupChapter("SpasmodicEvent", CHAPTERS)?.id, "c5");
	assert.equal(groupChapter("IgalltaEvent", CHAPTERS)?.id, "c6");
	assert.equal(groupChapter("321Event", CHAPTERS)?.id, undefined);
	assert.equal(groupChapter("Chapter12", CHAPTERS)?.id, undefined);
	assert.equal(groupChapter("SaturnOS", CHAPTERS)?.id, undefined);
	assert.equal(groupLabel("321Event"), "321");
	assert.equal(groupLabel("Chapter9"), "Chapter9");
});

test("clips come grouped in scene order, a scene's difficulty clips in difficulty order", () => {
	const list = clips([
		row("spas-unlock", "SpasmodicEvent"),
		row("ds-unlock-at", "Chapter9", { name: "ds unlockAT", scene: "ds" }),
		row("ds-unlock-difficulties", "Chapter9", {
			name: "ds unlockDifficulties",
			scene: "ds",
		}),
		row("ds-unlock-ez", "Chapter9", { name: "ds unlockEZ", scene: "ds" }),
		row("ds-unlock-hd", "Chapter9", { name: "ds unlockHD", scene: "ds" }),
		row("ds-unlock-in", "Chapter9", { name: "ds unlockIN", scene: "ds" }),
		row("ds-unlock-intro-sound", "Chapter9", {
			name: "ds unlockIntro_Sound",
			scene: "ds",
		}),
		row("321", "321Event"),
		row("chaos-intro", "Chapter9", {
			name: "Entrance_Intro",
			scene: undefined,
		}),
		row("iga-loop", "IgalltaEvent", { name: "Iga_Loop", scene: "iga" }),
		row("iga-main", "IgalltaEvent", { name: "Iga_Main", scene: "iga" }),
	]);
	const groups = groupClips(list, CHAPTERS);
	assert.deepEqual(
		groups.map((g) => [g.group, g.chapter?.id]),
		[
			["SpasmodicEvent", "c5"],
			["Chapter9", "c9"],
			["321Event", undefined],
			["IgalltaEvent", "c6"],
		],
	);
	assert.deepEqual(
		groups[3]?.clips.map((c) => c.id),
		["iga-main", "iga-loop"],
	);
	assert.deepEqual(
		groups[1]?.clips.map((c) => c.id),
		[
			"ds-unlock-intro-sound",
			"ds-unlock-ez",
			"ds-unlock-hd",
			"ds-unlock-in",
			"ds-unlock-at",
			"ds-unlock-difficulties",
			"chaos-intro",
		],
	);
});

test("the overlay index keeps only versions named after their clip and key", () => {
	const index = parseOverlayIndex({
		v: 1,
		clips: {
			"df-unlock": {
				kind: "level",
				variants: [
					{ key: "IN", file: "pv/overlay/df-unlock-IN.mp4", size: 10 },
					{ key: "SP", file: "pv/overlay/df-unlock-SP.mp4", size: 10 },
					{ key: "AT", file: "pv/overlay/other.mp4", size: 10 },
				],
			},
			qd: {
				kind: "lang",
				variants: [
					{ key: "en", file: "pv/overlay/qd-en.mp4", size: 5 },
					{ key: "zh-CN", file: "pv/overlay/qd-zh-CN.mp4", size: 5 },
					{ key: "ko", file: "pv/overlay/qd-ko.mp4", size: 5 },
					{ key: "fr", file: "pv/overlay/qd-fr.mp4", size: 5 },
				],
			},
			"time-reverse-video": {
				kind: "single",
				variants: [{ file: "pv/overlay/time-reverse-video.mp4", size: 1 }],
			},
			broken: { kind: "weird", variants: [] },
		},
	});
	assert.deepEqual(index?.get("df-unlock"), {
		kind: "level",
		versions: [{ key: "IN", file: "pv/overlay/df-unlock-IN.mp4", size: 10 }],
	});
	assert.deepEqual(
		index?.get("qd")?.versions.map((v) => v.key),
		["en", "zh-CN", "ko"],
	);
	assert.equal(index?.get("time-reverse-video")?.versions[0]?.key, undefined);
	assert.equal(index?.has("broken"), false);
	assert.equal(parseOverlayIndex({ v: 2, clips: {} }), undefined);
});

test("special clips list one MP4 per game language and go before the clip they name", () => {
	const version = (id: string, lang: string) => ({
		lang,
		file: `pv/special/${id}-${lang}.mp4`,
		size: 9,
		duration: 90,
	});
	const specials = parsePvSpecials({
		v: 1,
		clips: [
			{
				id: "deduction",
				name: "Deduction",
				group: "Chapter9",
				scene: "Assets/Phigros2/Chapter9/Deduction/Deduction.unity",
				width: 1920,
				height: 1080,
				audio: true,
				replay: "deduction",
				before: "after",
				versions: [
					version("deduction", "zh-CN"),
					version("deduction", "en"),
					{ ...version("deduction", "ja"), file: "pv/special/other-ja.mp4" },
					version("deduction", "fr"),
				],
			},
			{ id: "bad", width: 1, height: 1, versions: [] },
			{
				id: "late",
				width: 1,
				height: 1,
				before: "gone",
				versions: [version("late", "ko")],
			},
		],
	});
	assert.deepEqual(
		specials?.map((s) => [
			s.clip.id,
			s.clip.file,
			s.before,
			s.clip.replay,
			s.versions.map((v) => v.lang),
		]),
		[
			[
				"deduction",
				"pv/special/deduction-zh-CN.mp4",
				"after",
				"deduction",
				["zh-CN", "en"],
			],
			["late", "pv/special/late-ko.mp4", "gone", undefined, ["ko"]],
		],
	);
	const base = ["before", "after", "end"].map((id) => ({
		id,
		name: id,
		group: "g",
		scene: id,
		file: `pv/video/${id}.mp4`,
		size: 1,
		width: 1,
		height: 1,
		duration: 1,
		audio: false,
	}));
	assert.deepEqual(
		mergeSpecials(base, specials ?? []).map((c) => c.id),
		["before", "deduction", "after", "end", "late"],
	);
	const [first] = base;
	assert.ok(first);
	assert.deepEqual(
		mergeSpecials([{ ...first, id: "deduction" }], specials ?? []).map(
			(c) => c.file,
		),
		["pv/video/before.mp4", "pv/special/late-ko.mp4"],
	);
	assert.equal(parsePvSpecials({ v: 2, clips: [] }), undefined);
});
