import assert from "node:assert/strict";
import test from "node:test";
import {
	bounded,
	CHORD_KEY,
	MIX_KEY,
	NOISE_KEY,
	SIZE_KEY,
	SIZE_MAX,
	SIZE_MIN,
	storedMix,
	storedNumber,
	VOLUME_KEY,
	VOLUME_MAX,
} from "./host";

test("the setting keys keep the names browsers already store", () => {
	assert.deepEqual(
		[VOLUME_KEY, MIX_KEY, CHORD_KEY, NOISE_KEY, SIZE_KEY],
		[
			"webChartHitVolume",
			"webChartHitMix",
			"webChartChordColors",
			"webChartNoise",
			"webChartNoteSize",
		],
	);
});

test("a missing, empty or non-numeric value reads as no value", () => {
	for (const raw of [null, undefined, "", "abc", "NaN", "Infinity"]) {
		assert.equal(bounded(raw, 0, 1.5), null, String(raw));
	}
});

test("a number is clamped into its range", () => {
	assert.equal(bounded("2", 0, 1.5), 1.5);
	assert.equal(bounded("-1", 0, 1.5), 0);
	assert.equal(bounded("0.75", 0, 1.5), 0.75);
	assert.equal(bounded("0.5", SIZE_MIN, SIZE_MAX), 0.6);
});

test("a stored setting is read from local storage and clamped", () => {
	const g = globalThis as { window?: unknown };
	const before = g.window;
	const store = new Map<string, string>([
		["webChartHitVolume", "3"],
		["webChartNoteSize", "0.8"],
	]);
	g.window = {
		localStorage: {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => store.set(k, v),
		},
	};
	try {
		assert.equal(storedNumber(VOLUME_KEY, 0, VOLUME_MAX), 1.5);
		assert.equal(storedNumber(SIZE_KEY, SIZE_MIN, SIZE_MAX), 0.8);
		assert.equal(storedNumber(NOISE_KEY, 0, 1), null);
	} finally {
		g.window = before;
	}
});

test("storage that throws reads as no value", () => {
	const g = globalThis as { window?: unknown };
	const before = g.window;
	g.window = {
		localStorage: {
			getItem() {
				throw new Error("denied");
			},
			setItem() {
				throw new Error("denied");
			},
		},
	};
	try {
		assert.equal(storedNumber(VOLUME_KEY, 0, VOLUME_MAX), null);
	} finally {
		g.window = before;
	}
});

test("a stored hit-sound mix reads as three values from 0 to 1, or as no value", () => {
	const g = globalThis as { window?: unknown };
	const before = g.window;
	const store = new Map<string, string>();
	g.window = {
		localStorage: {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => store.set(k, v),
		},
	};
	try {
		assert.equal(storedMix(), null);
		store.set(MIX_KEY, "0.5,1,0");
		assert.deepEqual(storedMix(), [0.5, 1, 0]);
		store.set(MIX_KEY, "2,-1,0.25");
		assert.deepEqual(storedMix(), [1, 0, 0.25]);
		for (const raw of ["", "0.5,1", "0.5,1,1,1", "a,1,1", "0.5,,1"]) {
			store.set(MIX_KEY, raw);
			assert.equal(storedMix(), null, raw);
		}
	} finally {
		g.window = before;
	}
});
