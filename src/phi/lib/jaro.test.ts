import assert from "node:assert/strict";
import test from "node:test";
import { JARO_PUNCT, jaroWinkler } from "./jaro";

test("jaroWinkler keeps phi-plugin's scores", () => {
	assert.equal(jaroWinkler("MARTHA", "MARHTA").toFixed(4), "0.9611");
	assert.equal(jaroWinkler("DIXON", "DICKSONX").toFixed(4), "0.8133");
	assert.equal(jaroWinkler("abc", "xyz"), 0);
	// Short strings clear the 0.85 cut on one shared prefix character, so song search needs 3+ characters
	assert.ok(jaroWinkler("7", "70") >= 0.85);
});

test("JARO_PUNCT is safe to reuse with replace", () => {
	assert.equal("a-b c".replace(JARO_PUNCT, ""), "abc");
	assert.equal("a-b c".replace(JARO_PUNCT, ""), "abc");
	assert.equal(">w<".replace(JARO_PUNCT, ""), "w");
	assert.equal(jaroWinkler("martha", "marhta").toFixed(4), "0.9611");
	assert.equal(jaroWinkler("", "a"), 0);
});
