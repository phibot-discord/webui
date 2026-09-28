import assert from "node:assert/strict";
import test from "node:test";
import { getInfo } from "@/phi/lib/get-info";
import type { PhiRuntime } from "@/phi/lib/runtime";
import { Save } from "@/phi/lib/save";
import { saveIdentity } from "@/phi/lib/saves";
import {
	loadManual,
	manualSave,
	manualSavePayload,
	normalizeManualInput,
} from "./manual";

const rt = { Save } as unknown as PhiRuntime;

function seedCatalog() {
	getInfo.ori_info = {
		"Credits.Frums.0": {
			id: "Credits.Frums.0",
			song: "Credits",
			chart: {
				IN: {
					id: "Credits.Frums.0",
					rank: "IN",
					charter: "",
					difficulty: 13.6,
					combo: 1000,
				},
				AT: {
					id: "Credits.Frums.0",
					rank: "AT",
					charter: "",
					difficulty: 15.7,
					combo: 1200,
				},
			},
		},
		"Glaciaxion.SunsetRay.0": {
			id: "Glaciaxion.SunsetRay.0",
			song: "Glaciaxion",
			chart: {
				IN: {
					id: "Glaciaxion.SunsetRay.0",
					rank: "IN",
					charter: "",
					difficulty: 12.6,
				},
			},
		},
	};
	getInfo.songsid = {
		"Credits.Frums.0": "Credits",
		"Glaciaxion.SunsetRay.0": "Glaciaxion",
	};
}

test("normalizeManualInput validates against the catalog and dedupes", () => {
	seedCatalog();
	const out = normalizeManualInput(
		{
			playerId: "  <b>Yue</b>  ",
			records: [
				{ id: "Credits.Frums.0", rank: "AT", acc: 99.876, score: 987654 },
				{ id: "Credits.Frums.0", rank: "AT", acc: 50 },
				{ id: "Credits.Frums.0", rank: "IN", acc: 100 },
				{
					id: "Glaciaxion.SunsetRay.0",
					rank: "IN",
					acc: 97.5,
					fc: true,
					score: "",
				},
			],
		},
		"Player",
	);
	assert.ok(!("error" in out));
	if ("error" in out) return;
	assert.equal(out.playerId, "bYue/b");
	assert.deepEqual(out.records, [
		{ id: "Credits.Frums.0", rank: "AT", acc: 99.876, score: 987654 },
		{ id: "Credits.Frums.0", rank: "IN", acc: 100, fc: true },
		{ id: "Glaciaxion.SunsetRay.0", rank: "IN", acc: 97.5, fc: true },
	]);
});

test("normalizeManualInput rejects unknown charts and bad numbers", () => {
	seedCatalog();
	assert.deepEqual(
		normalizeManualInput(
			{ records: [{ id: "Credits.Frums.0", rank: "EZ", acc: 99 }] },
			"P",
		),
		{ error: "unknown_chart", status: 400, detail: "Credits.Frums.0 EZ" },
	);
	assert.equal(
		(
			normalizeManualInput(
				{ records: [{ id: "Credits.Frums.0", rank: "IN", acc: 101 }] },
				"P",
			) as { error: string }
		).error,
		"bad_request",
	);
	assert.equal(
		(
			normalizeManualInput(
				{
					records: [{ id: "Credits.Frums.0", rank: "IN", acc: 99, score: 1e7 }],
				},
				"P",
			) as { error: string }
		).error,
		"bad_request",
	);
	assert.equal(
		(normalizeManualInput({}, "P") as { error: string }).error,
		"bad_request",
	);
	const empty = normalizeManualInput({ records: [] }, "Fallback");
	assert.deepEqual(empty, { playerId: "Fallback", records: [] });
});

test("manualSave computes RKS from the current constants", () => {
	seedCatalog();
	const data = {
		v: 1 as const,
		playerId: "Yue",
		updatedAt: "2026-09-20T10:00:00.000Z",
		rks: 0,
		records: [
			{ id: "Credits.Frums.0", rank: "AT" as const, acc: 100 },
			{ id: "Credits.Frums.0", rank: "IN" as const, acc: 99, fc: true },
			{ id: "Glaciaxion.SunsetRay.0", rank: "IN" as const, acc: 97.5 },
		],
	};
	const save = manualSave(rt, data, "uid1");
	const records = save.getRecord();
	assert.equal(records.length, 3);
	assert.equal(records[0]?.rks, 15.7);
	assert.equal(records[0]?.score, 1_000_000);
	assert.equal(records[0]?.Rating, "phi");
	assert.equal(records[1]?.fc, true);
	assert.equal(records[1]?.score, Math.round(900_000 * 0.99 + 100_000));
	// phi: only the AP chart → 15.7; best 27: all three
	const expected = (15.7 + records.reduce((s, r) => s + r.rks, 0)) / 30;
	assert.ok(Math.abs(save.saveInfo.summary.rankingScore - expected) < 1e-9);
	assert.equal(save.gameuser.background, "Credits");
	assert.equal(save.saveInfo.PlayerId, "Yue");
	assert.ok(saveIdentity(save.saveInfo).includes("uid1/"));
});

test("manual payload identity changes with every edit", () => {
	const base = { v: 1 as const, playerId: "A", records: [], rks: 0 };
	const a = manualSavePayload(
		{ ...base, updatedAt: "2026-09-20T10:00:00.000Z" },
		"u",
	);
	const b = manualSavePayload(
		{ ...base, updatedAt: "2026-09-20T10:00:01.000Z" },
		"u",
	);
	assert.notEqual(saveIdentity(a.saveInfo), saveIdentity(b.saveInfo));
	assert.equal(a.saveInfo.summary.challengeModeRank, 0);
});

test("loadManual tolerates garbage and drops invalid rows", async () => {
	const kv = new Map<string, string>();
	const db = { get: async (k: string) => kv.get(k) };
	assert.equal(await loadManual(db, "u"), undefined);
	kv.set("phi:manualSave:u", "not json");
	assert.equal(await loadManual(db, "u"), undefined);
	kv.set(
		"phi:manualSave:u",
		JSON.stringify({
			v: 1,
			playerId: "P",
			updatedAt: "2026-01-01T00:00:00.000Z",
			rks: 12.3,
			records: [
				{ id: "X.0", rank: "IN", acc: 99 },
				{ id: "Y.0", rank: "SP", acc: 99 },
				{ id: "Z.0", rank: "IN", acc: 120 },
				null,
			],
		}),
	);
	const got = await loadManual(db, "u");
	assert.deepEqual(got?.records, [{ id: "X.0", rank: "IN", acc: 99 }]);
	assert.equal(got?.rks, 12.3);
});
