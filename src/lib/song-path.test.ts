import assert from "node:assert/strict";
import test from "node:test";
import { localePath } from "./locale-path";
import { songPath, songSlug } from "./song-path";

test("slugs drop the .0 and every dot, so locale paths never see a file extension", () => {
	assert.equal(songSlug("Aleph0.LeaF.0"), "Aleph0-LeaF");
	assert.equal(songPath("Aleph0.LeaF.0"), "/songs/Aleph0-LeaF");
	assert.equal(
		localePath(songPath("Aleph0.LeaF.0"), "zh"),
		"/zh/songs/Aleph0-LeaF",
	);
	assert.equal(
		localePath(songPath("AfterZABANIYAMUGEdit.Daily天利.0"), "zh"),
		`/zh/songs/${encodeURIComponent("AfterZABANIYAMUGEdit-Daily天利")}`,
	);
});
