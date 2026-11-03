import assert from "node:assert/strict";
import test from "node:test";
import { packPhiraChart } from "@/phi/lib/phira";
import { compileChart } from "./chart";
import { unpack } from "./pack";

test("a Phira pack gives back its chart and music", async () => {
	const chart = JSON.stringify({
		formatVersion: 3,
		offset: 0,
		judgeLineList: [
			{
				bpm: 120,
				judgeLineMoveEvents: [],
				judgeLineRotateEvents: [],
				judgeLineDisappearEvents: [],
				speedEvents: [],
				notesAbove: [
					{
						type: 1,
						time: 64,
						positionX: 0,
						holdTime: 0,
						speed: 1,
						floorPosition: 1,
					},
				],
				notesBelow: [],
			},
		],
	});
	const song = new Uint8Array([79, 103, 103, 83, 1, 2, 3]);
	const pez = await packPhiraChart({
		id: "Song.A",
		name: "Song",
		level: "SP",
		difficulty: "?",
		composer: "",
		illustrator: "",
		charter: "",
		chart,
		picture: new Uint8Array([137, 80, 78, 71]),
		song,
	});
	const got = await unpack(
		pez.buffer.slice(
			pez.byteOffset,
			pez.byteOffset + pez.byteLength,
		) as ArrayBuffer,
	);
	assert.equal(compileChart(got.chart).notes.time.length, 1);
	assert.deepEqual(new Uint8Array(got.music ?? new ArrayBuffer(0)), song);
});
