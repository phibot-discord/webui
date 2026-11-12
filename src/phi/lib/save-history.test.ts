import assert from "node:assert/strict";
import test from "node:test";
import { Save, type SavePayload } from "./save";
import { SaveHistory } from "./save-history";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1, 4, 0, 0);

function day(n: number) {
	return new Date(T0 + n * DAY);
}

function saveOn(n: number, acc: number, score: number) {
	return {
		gameRecord: { "song.0": [null, null, { acc, score, fc: false }] },
		saveInfo: {
			modifiedAt: { iso: day(n) },
			summary: { rankingScore: 15, challengeModeRank: 0 },
		},
		gameProgress: { money: [0, 0, 0, 0, 0] },
	} as never;
}

function datesOf(history: SaveHistory) {
	return (history.scoreHistory["song.0"]?.IN ?? []).map((row) =>
		new Date(row[2]).toISOString(),
	);
}

test("each new score is stored after the one before it", () => {
	const history = new SaveHistory(null);
	history.update(saveOn(1, 97.5, 975_000));
	history.update(saveOn(2, 98, 980_000));
	history.update(saveOn(3, 99, 990_000));
	assert.deepEqual(datesOf(history), [
		day(1).toISOString(),
		day(2).toISOString(),
		day(3).toISOString(),
	]);
});

test("a save older than everything stored goes first", () => {
	const history = new SaveHistory(null);
	history.update(saveOn(2, 98, 980_000));
	history.update(saveOn(1, 97.5, 975_000));
	assert.deepEqual(datesOf(history), [
		day(1).toISOString(),
		day(2).toISOString(),
	]);
});

test("an unchanged score adds nothing", () => {
	const history = new SaveHistory(null);
	history.update(saveOn(1, 98, 980_000));
	history.update(saveOn(1, 98, 980_000));
	assert.equal(datesOf(history).length, 1);
});

test("lists stored in the old order are sorted when loaded", () => {
	const row = (n: number) => ["98.0000", 980_000, day(n).toISOString(), false];
	const history = new SaveHistory({
		version: 3,
		scoreHistory: { "song.0": { IN: [row(2), row(3), row(1)] } },
	} as never);
	assert.deepEqual(datesOf(history), [
		day(1).toISOString(),
		day(2).toISOString(),
		day(3).toISOString(),
	]);
});

function payloadOn(
	n: number,
	gameProgress: SavePayload["gameProgress"],
	rankingScore: number,
	challengeModeRank: number,
): SavePayload {
	return {
		session: "s",
		saveInfo: {
			PlayerId: "p",
			modifiedAt: { iso: day(n) },
			summary: { rankingScore, challengeModeRank, updatedAt: day(n) },
		},
		gameRecord: {},
		gameProgress,
	};
}

function linesOf(history: SaveHistory) {
	return {
		data: history.data.map((point) => point.value),
		rks: history.rks.map((point) => point.value),
		challengeModeRank: history.challengeModeRank.map((point) => point.value),
	};
}

test("a save with money adds a data point, and the rks and challenge lines follow", () => {
	const history = new SaveHistory(null);
	history.update(new Save(payloadOn(1, { money: [5, 3, 0, 0, 0] }, 15, 0)));
	history.update(new Save(payloadOn(2, { money: [6, 3, 0, 0, 0] }, 15.5, 101)));
	assert.deepEqual(linesOf(history), {
		data: [
			[5, 3, 0, 0, 0],
			[6, 3, 0, 0, 0],
		],
		rks: [15, 15.5],
		challengeModeRank: [0, 101],
	});
});

test("a save whose progress gave no money adds no data point, and the rks and challenge lines still update", () => {
	const history = new SaveHistory(null);
	history.update(new Save(payloadOn(1, { money: [5, 3, 0, 0, 0] }, 15, 0)));
	const stored = JSON.stringify(payloadOn(2, { completed: "3.0" }, 15.5, 101));
	const save = new Save(JSON.parse(stored));
	assert.deepEqual(save.gameProgress.money, [0, 0, 0, 0, 0]);
	history.update(save);
	assert.deepEqual(linesOf(history), {
		data: [[5, 3, 0, 0, 0]],
		rks: [15, 15.5],
		challengeModeRank: [0, 101],
	});
});
