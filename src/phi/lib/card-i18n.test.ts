import assert from "node:assert/strict";
import test from "node:test";
import { resolvePhiLocale } from "./card-i18n";

test("card render locale prefers the request over stored notes", () => {
	assert.equal(resolvePhiLocale("en", "zh"), "en");
	assert.equal(resolvePhiLocale("zh", "en"), "zh");
	assert.equal(resolvePhiLocale(undefined, "zh"), "zh");
	assert.equal(resolvePhiLocale("en", undefined), "en");
});
