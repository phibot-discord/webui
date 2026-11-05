import assert from "node:assert/strict";
import test from "node:test";
import { localizeChartTagName } from "@/phi/lib/card-i18n";
import { TAG_CLIPS } from "./tag-clips";

test("every clip names a known tag and a playable chart", () => {
	const entries = Object.entries(TAG_CLIPS.clips);
	assert.ok(entries.length >= 30);
	assert.ok(TAG_CLIPS.length > 0);
	for (const [tag, clip] of entries) {
		assert.notEqual(localizeChartTagName(tag, "en"), tag, tag);
		assert.ok(["EZ", "HD", "IN", "AT"].includes(clip.level), tag);
		assert.ok(clip.id.endsWith(".0"), tag);
		assert.ok(clip.start >= 0, tag);
		assert.ok(clip.votes >= 0 && clip.votes <= clip.total, tag);
	}
});
