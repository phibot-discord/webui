import assert from "node:assert/strict";
import test from "node:test";
import { bounced, safeNext } from "./safe-next";

test("a same-site path comes back unchanged", () => {
	for (const p of [
		"/me",
		"/me/b30",
		"/zh/songs",
		"/files?view=pv&id=x#top",
		"/songs/A-B?x=1%202",
	]) {
		assert.equal(safeNext(p), p, p);
	}
});

test("nothing or an empty string falls back to /me", () => {
	for (const v of [undefined, null, ""]) {
		assert.equal(safeNext(v), "/me", String(v));
	}
});

test("another site is refused", () => {
	for (const v of [
		"https://evil.example",
		"//evil.example",
		"/\\evil.example",
		"\\\\evil.example",
		"/a://b",
		"evil.example",
	]) {
		assert.equal(safeNext(v), "/me", v);
	}
});

test("control characters are refused", () => {
	for (const v of [
		"/\t/evil.example",
		"/\n/evil.example",
		"/\r/evil.example",
		"/\u0000x",
		"/a\u007f",
		"/me\t",
	]) {
		assert.equal(safeNext(v), "/me", JSON.stringify(v));
	}
});

test("a path that normalises to another site is refused", () => {
	for (const v of [
		"/..//evil.example",
		"/.//evil.example",
		"/a/..//evil.example/",
	]) {
		assert.equal(safeNext(v), "/me", v);
	}
});

test("a value that is not a string is refused", () => {
	for (const v of [["/a", "/b"], 123, {}]) {
		assert.equal(safeNext(v), "/me", JSON.stringify(v));
	}
});

test("only a redirect to the sign-in page counts as bounced", () => {
	assert.equal(bounced({ next: "/me/b30" }), true);
	assert.equal(bounced({ next: "/versions", asked: "1" }), false);
	assert.equal(bounced({}), false);
	assert.equal(bounced({ asked: "1" }), false);
});
