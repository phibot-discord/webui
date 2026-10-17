import assert from "node:assert/strict";
import test from "node:test";
import { cardR2Keys } from "./cache";

test("a kind's cards share a folder, and its current files share a version prefix", () => {
	const base = { userId: "123", kind: "b30", version: "rev1|0|v48" };
	const zh = cardR2Keys({ ...base, variant: "zh" });
	const en = cardR2Keys({ ...base, variant: "en" });
	const newer = cardR2Keys({ ...base, version: "rev2|0|v48", variant: "zh" });
	assert.equal(zh.dir, "cards/123/b30/");
	assert.match(zh.key, /^cards\/123\/b30\/[0-9a-f]{16}-[0-9a-f]{32}\.jpg$/);
	assert.ok(en.key.startsWith(zh.current), "variants of a version coexist");
	assert.notEqual(en.key, zh.key);
	assert.equal(newer.dir, zh.dir);
	assert.ok(!zh.key.startsWith(newer.current), "an older version is stale");
	assert.equal(
		cardR2Keys({ ...base, userId: "a/b", variant: "" }).dir,
		"cards/a_b/b30/",
	);
});
