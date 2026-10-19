import assert from "node:assert/strict";
import test from "node:test";
import { isMovedHost } from "./site";

test("only the old hostnames show the move notice", () => {
	assert.equal(isMovedHost("phi.yuemiyuki.dev"), true);
	assert.equal(isMovedHost("PHI.yuemiyuki.dev:443"), true);
	assert.equal(isMovedHost("phibot.dev"), false);
	assert.equal(isMovedHost("pv.phi.yuemiyuki.dev"), false);
	assert.equal(isMovedHost("phi-webui.vercel.app"), false);
	assert.equal(isMovedHost(""), false);
});
