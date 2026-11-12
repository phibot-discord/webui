import assert from "node:assert/strict";
import test from "node:test";
import {
	pickRequestLocale,
	requestLocale,
	setRequestLocaleForTest,
} from "./request";

test("the page address beats the cookie and the cookie beats Accept-Language", () => {
	assert.equal(pickRequestLocale("zh", "ja", "en"), "zh");
	assert.equal(pickRequestLocale(null, "ja", "zh"), "ja");
	assert.equal(pickRequestLocale(null, undefined, "ja,en;q=0.5"), "ja");
	assert.equal(pickRequestLocale("xx", "fr", null), "en");
});

test("the request locale follows the test seam", async () => {
	setRequestLocaleForTest("ja");
	try {
		assert.equal(await requestLocale(), "ja");
	} finally {
		setRequestLocaleForTest();
	}
});
