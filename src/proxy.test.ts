import assert from "node:assert/strict";
import test from "node:test";
import { config } from "./proxy";

test("the proxy gates /me pages only; API routes check the session themselves", () => {
	assert.deepEqual(config.matcher, ["/me", "/me/:path*"]);
	assert.equal(
		config.matcher.some((m) => m.startsWith("/api")),
		false,
	);
});
