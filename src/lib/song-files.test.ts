import assert from "node:assert/strict";
import test from "node:test";
import type { CollectionChapter } from "./collection";
import type { PvClip } from "./pv";
import { clipNamesSong, songChapterId, songClips } from "./song-files";

const chapter = (
	id: string,
	unlock: string | null = null,
): CollectionChapter => ({
	id,
	kind: id.startsWith("s") ? "side" : id === "ex" ? "ex" : "main",
	name: { en: id },
	label: null,
	unlock,
});

const CHAPTERS = [
	chapter("ex"),
	chapter("c5", "Spasmodic"),
	chapter("c8"),
	chapter("c9"),
	chapter("s3"),
	chapter("extra"),
];

const clip = (
	id: string,
	group: string,
	name: string,
	scene: string,
): PvClip => ({
	id,
	name,
	group,
	scene,
	file: `pv/video/${id}.mp4`,
	size: 1,
	width: 1920,
	height: 1080,
	duration: 1,
	audio: true,
});

const CLIPS = [
	clip(
		"spas-unlock",
		"SpasmodicEvent",
		"Spas_Unlock",
		"Assets/TrackEventFile/SpasmodicEvent/FakeAboutUs.unity",
	),
	clip(
		"321-unlock-final-plus",
		"321Event",
		"321_Unlock_Final_Plus",
		"Assets/TrackEventFile/321Event/321Unlock.unity",
	),
	clip("qd", "QDEvent", "QD", "Assets/TrackEventFile/QDEvent/QDEvent.unity"),
	clip(
		"df-unlock",
		"DFEvent",
		"DF_Unlock",
		"Assets/TrackEventFile/DFEvent/DFUnlock.unity",
	),
	clip(
		"to-phase2",
		"Chapter9",
		"ToPhase2",
		"Assets/Phigros2/Chapter9/FirstEnterPhase2VideoPlayer.unity",
	),
	clip(
		"ds-unlock-at",
		"Chapter9",
		"ds unlockAT",
		"Assets/Phigros2/Chapter9/DesultorySignalsIntro/DesultorySignalsIntro.unity",
	),
	clip(
		"entrance-to-the-chaos-intro",
		"Chapter9",
		"Entrance to the Chaos_Intro",
		"None",
	),
];

test("a song's chapter string maps to a Collection chapter", () => {
	assert.equal(songChapterId("Chapter 5 霓虹灯牌", CHAPTERS), "c5");
	assert.equal(songChapterId("Chapter 9 穹顶孤舟", CHAPTERS), "c9");
	assert.equal(songChapterId("Side Story 3 盗乐行", CHAPTERS), "s3");
	assert.equal(songChapterId("Extra Story Chapter 极星卫", CHAPTERS), "extra");
	assert.equal(songChapterId("Chapter EX-KALPA 精选集", CHAPTERS), "ex");
	assert.equal(songChapterId("Chapter 6 方舟蜃景", CHAPTERS), undefined);
	assert.equal(songChapterId("Chapter Legacy 过去的章节", CHAPTERS), undefined);
	assert.equal(songChapterId("Single-单曲 精选集", CHAPTERS), undefined);
});

test("a clip names a song by event, scene or clip name", () => {
	const names = (id: string, title: string) =>
		CLIPS.filter((c) => clipNamesSong(c, { id, title, chapter: "" })).map(
			(c) => c.id,
		);
	assert.deepEqual(names("Spasmodic.姜米條颶風元力上人.0", "Spasmodic"), [
		"spas-unlock",
	]);
	assert.deepEqual(
		names("DESTRUCTION321.Normal1zervsBrokenNerdz.0", "DESTRUCTION 3,2,1"),
		["321-unlock-final-plus"],
	);
	assert.deepEqual(
		names("DesultorySignals.technoplanet.0", "Desultory Signals"),
		["ds-unlock-at"],
	);
	assert.deepEqual(
		names("EntrancetotheChaos.打打だいずvssiromaru.0", "Entrance to the Chaos"),
		["entrance-to-the-chaos-intro"],
	);
	assert.deepEqual(names("DistortedFate.Sakuzyo.0", "Distorted Fate"), []);
	assert.deepEqual(names("Glaciaxion.SunsetRay.0", "Glaciaxion"), []);
});

test("song clips split the song's own from its chapter's", () => {
	const transcripts = new Map([["qd", "c8"]]);
	const got = songClips(
		{
			id: "DESTRUCTION321.Normal1zervsBrokenNerdz.0",
			title: "DESTRUCTION 3,2,1",
			chapter: "Chapter 8 凌日潮汐",
		},
		CLIPS,
		CHAPTERS,
		(id) => transcripts.get(id),
	);
	assert.equal(got.chapterId, "c8");
	assert.deepEqual(
		got.own.map((c) => c.id),
		["321-unlock-final-plus"],
	);
	assert.deepEqual(
		got.chapter.map((c) => c.id),
		["qd"],
	);
	const c9 = songClips(
		{
			id: "DesultorySignals.technoplanet.0",
			title: "Desultory Signals",
			chapter: "Chapter 9 穹顶孤舟",
		},
		CLIPS,
		CHAPTERS,
		() => undefined,
	);
	assert.deepEqual(
		c9.own.map((c) => c.id),
		["ds-unlock-at"],
	);
	assert.deepEqual(
		c9.chapter.map((c) => c.id),
		["to-phase2", "entrance-to-the-chaos-intro"],
	);
});
