import assert from "node:assert/strict";
import test from "node:test";
import { JARO_PUNCT, jaroWinkler, jaroWinklerDistance } from "./jaro";

test("jaroWinklerDistance ignores case, punctuation and surrounding space", () => {
	assert.equal(jaroWinklerDistance("Rrhar'il", "rrharil"), 1);
	assert.equal(jaroWinklerDistance("  Igallta ", "Igallta"), 1);
	assert.equal(jaroWinklerDistance("【狂喜蘭舞】", "狂喜蘭舞"), 1);
	assert.equal(jaroWinklerDistance("!!!", "abc"), 0);
	assert.equal(jaroWinklerDistance("", ""), 1);
});

test("jaroWinklerDistance keeps phi-plugin's scores", () => {
	assert.equal(jaroWinklerDistance("MARTHA", "MARHTA").toFixed(4), "0.9611");
	assert.equal(jaroWinklerDistance("DIXON", "DICKSONX").toFixed(4), "0.8133");
	assert.equal(jaroWinklerDistance("abc", "xyz"), 0);
	// Short strings clear the 0.85 cut on one shared prefix character, so song search needs 3+ characters
	assert.ok(jaroWinklerDistance("7", "70") >= 0.85);
});

test("JARO_PUNCT is safe to reuse with replace", () => {
	assert.equal("a-b c".replace(JARO_PUNCT, ""), "abc");
	assert.equal("a-b c".replace(JARO_PUNCT, ""), "abc");
	assert.equal(">w<".replace(JARO_PUNCT, ""), "w");
	assert.equal(jaroWinkler("martha", "marhta").toFixed(4), "0.9611");
	assert.equal(jaroWinkler("", "a"), 0);
});
