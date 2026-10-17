import assert from "node:assert/strict";
import test from "node:test";
import { isExtraPackLevel, packLevelName } from "./chart-catalog";

test("a pack level reads as its difficulty, with any variant after it", () => {
	assert.deepEqual(packLevelName("IN"), { base: "IN", tag: "", label: "IN" });
	assert.deepEqual(packLevelName("SP"), { base: "SP", tag: "", label: "SP" });
	assert.deepEqual(packLevelName("EZ_Error"), {
		base: "EZ",
		tag: "Error",
		label: "EZ Error",
	});
	assert.equal(packLevelName("HD_Error")?.label, "HD Error");
	assert.equal(packLevelName("IN_Error")?.base, "IN");
	assert.equal(packLevelName("AT_Legacy2")?.label, "AT Legacy2");
});

test("any other level the ripper packs gets a neutral name", () => {
	assert.deepEqual(packLevelName("Legacy"), { tag: "", label: "Legacy" });
	assert.deepEqual(packLevelName("EZ_Error_2"), {
		base: "EZ",
		tag: "Error 2",
		label: "EZ Error 2",
	});
	for (const level of [
		"",
		"ez error",
		"EZ_",
		"EZ-Error",
		"_SP",
		"1x",
		"a".repeat(33),
	]) {
		assert.equal(packLevelName(level), undefined, level);
	}
});

test("extra packs are every level beyond the four the song list scores", () => {
	for (const level of [
		"SP",
		"EZ_Error",
		"HD_Error",
		"IN_Error",
		"Legacy",
		"AT_Error",
	]) {
		assert.equal(isExtraPackLevel(level), true, level);
	}
	for (const level of ["EZ", "HD", "IN", "AT", "", "../x", "SP.pez"]) {
		assert.equal(isExtraPackLevel(level), false, level);
	}
});
