import assert from "node:assert/strict";
import test from "node:test";
import { saveRevision } from "./bound";
import type { Save } from "@/phi/lib/save";

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
