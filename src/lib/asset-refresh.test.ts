import assert from "node:assert/strict";
import test from "node:test";
import {
	markRefresh,
	readRefreshToken,
	refreshedVersion,
	refreshToken,
} from "./asset-refresh";

const DAY = 24 * 60 * 60 * 1000;

test("a refresh adds the token to each R2 link's version", () => {
	assert.equal(refreshedVersion("0123abcd", undefined), "0123abcd");
	assert.equal(refreshedVersion("0123abcd", "t1"), "0123abcd-t1");
	assert.equal(refreshedVersion(undefined, "t1"), "0-t1");
});

test("the refresh token lasts 30 days", () => {
	assert.equal(refreshToken(undefined, 1_000), undefined);
	assert.equal(refreshToken("junk", 1_000), undefined);
	assert.equal(refreshToken("1000", 1_000 + 29 * DAY), (1_000).toString(36));
	assert.equal(refreshToken("1000", 1_000 + 31 * DAY), undefined);
});

test("the button's stamp goes to a cookie the server reads too", () => {
	const g = globalThis as { document?: unknown };
	let jar = "";
	g.document = {
		get cookie() {
			return jar;
		},
		set cookie(v: string) {
			jar = v.split(";")[0] ?? "";
		},
	};
	try {
		markRefresh(1_000);
		assert.equal(jar, "phi-asset-refresh=1000");
		assert.equal(readRefreshToken(1_000), (1_000).toString(36));
	} finally {
		delete g.document;
	}
	assert.equal(readRefreshToken(), undefined, "no document, no token");
});
