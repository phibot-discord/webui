import assert from "node:assert/strict";
import test from "node:test";
import { currentGroup, NAV_GROUPS } from "./nav";

test("the three groups hold the pages the user asked for", () => {
	const ids = Object.fromEntries(
		NAV_GROUPS.map((g) => [g.id, g.items.map((i) => i.id)]),
	);
	assert.deepEqual(Object.keys(ids), ["tools", "scores", "files"]);
	for (const id of ["score", "phira", "songs", "targets", "tags", "simulate"]) {
		assert.ok(ids.tools?.includes(id as never), id);
	}
	assert.ok(ids.scores?.includes("b30"));
	assert.ok(ids.scores?.includes("compare"));
	assert.ok(ids.files?.includes("pv"));
});

test("a page lights up its group", () => {
	assert.equal(currentGroup("/me/b30"), "scores");
	assert.equal(currentGroup("/progress"), "scores");
	assert.equal(currentGroup("/compare"), "scores");
	assert.equal(currentGroup("/targets"), "tools");
	assert.equal(currentGroup("/songs/Aleph0-LeaF"), "tools");
	assert.equal(currentGroup("/phira-mp"), "tools");
	assert.equal(currentGroup("/files"), "files");
	assert.equal(currentGroup("/account"), undefined);
	assert.equal(currentGroup("/"), undefined);
});
