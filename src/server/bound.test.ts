import assert from "node:assert/strict";
import test from "node:test";
import type { Save } from "@/phi/lib/save";
import { resolveCardEpoch, saveRevision } from "./bound";

function save(over: {
	url?: string;
	iso?: string | Date;
	updatedAt?: string;
}): Save {
	return {
		saveInfo: {
			gameFile: { url: over.url },
			modifiedAt: { iso: over.iso ?? "2024-01-01T00:00:00.000Z" },
			summary: {
				rankingScore: 0,
				challengeModeRank: 0,
				updatedAt: over.updatedAt ?? "2024-01-01T00:00:00.000Z",
			},
			PlayerId: "p",
		},
	} as Save;
}

test("saveRevision ignores signed query on the same game file", () => {
	assert.equal(
		saveRevision(save({ url: "https://cdn.example/save.zip?sign=aaa&t=1" })),
		saveRevision(save({ url: "https://cdn.example/save.zip?sign=bbb&t=2" })),
	);
});

test("saveRevision changes only when the file or modified time changes", () => {
	const a = saveRevision(save({ url: "https://cdn.example/save.zip" }));
	assert.notEqual(
		a,
		saveRevision(save({ url: "https://cdn.example/other.zip" })),
	);
	assert.notEqual(
		a,
		saveRevision(
			save({
				url: "https://cdn.example/save.zip",
				iso: "2024-02-01T00:00:00.000Z",
			}),
		),
	);
});

test("bypass epoch from the client wins over a stale KV read", () => {
	assert.equal(resolveCardEpoch("1710000000000", ""), "1710000000000");
	assert.equal(resolveCardEpoch("1710000000000", "1"), "1710000000000");
	assert.equal(resolveCardEpoch(undefined, "1"), "1");
	assert.equal(resolveCardEpoch("nope", "1"), "1");
});
