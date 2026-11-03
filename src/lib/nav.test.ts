import assert from "node:assert/strict";
import test from "node:test";
import { currentGroup } from "./nav";

test("a page lights up its group", () => {
	assert.equal(currentGroup("/me/b30"), "scores");
	assert.equal(currentGroup("/progress"), "scores");
	assert.equal(currentGroup("/compare"), "scores");
	assert.equal(currentGroup("/targets"), "tools");
	assert.equal(currentGroup("/songs/Aleph0-LeaF"), "tools");
	assert.equal(currentGroup("/phira-mp"), "tools");
	assert.equal(currentGroup("/files"), "files");
	assert.equal(currentGroup("/versions"), "files");
	assert.equal(currentGroup("/account"), undefined);
	assert.equal(currentGroup("/"), undefined);
});
