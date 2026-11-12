import assert from "node:assert/strict";
import test from "node:test";
import { needsSessionLoad } from "./header-session";

test("the header loads the session on its first mount", () => {
	assert.equal(needsSessionLoad(null, "/zh", false), true);
});

test("a later page reloads it only after a sign-in or sign-out marked it stale", () => {
	assert.equal(needsSessionLoad("/zh/me", "/zh", false), false);
	assert.equal(needsSessionLoad("/zh/me", "/zh", true), true);
	assert.equal(needsSessionLoad("/zh", "/zh", true), false);
});
