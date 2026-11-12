import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "next-auth";
import { headerSession } from "./header-session";

const session = (user: Session["user"]) =>
	({ user, expires: "2099-01-01" }) as Session;

test("a visitor without a session is signed out", () => {
	assert.deepEqual(headerSession(null), {
		signedIn: false,
		name: null,
		image: null,
	});
});

test("a TapTap session whose proof failed is signed out", () => {
	const out = headerSession(session({ id: "", name: "Ann" }));
	assert.equal(out.signedIn, false);
	assert.equal(out.name, null);
});

test("a signed-in session gives the name and the site's avatar path", () => {
	const out = headerSession(
		session({
			id: "1",
			name: "Ann",
			image: "https://cdn.discordapp.com/avatars/1/a.png",
		}),
	);
	assert.equal(out.signedIn, true);
	assert.equal(out.name, "Ann");
	assert.ok(out.image?.startsWith("/api/me/avatar?v="));
});

test("an avatar from another host is dropped", () => {
	const out = headerSession(
		session({ id: "1", name: "Ann", image: "https://example.com/a.png" }),
	);
	assert.equal(out.image, null);
});
