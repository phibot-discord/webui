import assert from "node:assert/strict";
import test from "node:test";

process.env.AUTH_SECRET ||= "test-secret-test-secret-test-secret";

const {
	isLoginId,
	openDiscordLink,
	openTapTicket,
	readCookie,
	sealDiscordLink,
	sealTapTicket,
	tapLoginIdFrom,
	tapObjectId,
	tapUserId,
} = await import("./auth-tickets");

const LOGIN = "a".repeat(32);

test("a TapTap ticket opens only for the sign-in it was issued to", async () => {
	const user = { id: "tap:obj1", name: "Player", image: "https://img/a.png" };
	const ticket = await sealTapTicket(LOGIN, user);
	assert.deepEqual(await openTapTicket(ticket, LOGIN), user);
	assert.equal(await openTapTicket(ticket, "b".repeat(32)), null);
	assert.equal(await openTapTicket(ticket, undefined), null);
});

test("a linked sign-in's ticket names the Discord user", async () => {
	const ticket = await sealTapTicket(LOGIN, { id: "123456789012345678" });
	assert.deepEqual(await openTapTicket(ticket, LOGIN), {
		id: "123456789012345678",
		name: undefined,
		image: undefined,
	});
});

test("garbage and the other kind of sealed value do not open as a ticket", async () => {
	assert.equal(await openTapTicket("nope", LOGIN), null);
	assert.equal(await openTapTicket(undefined, LOGIN), null);
	const link = await sealDiscordLink("tap:obj1");
	assert.equal(await openTapTicket(link, LOGIN), null);
});

test("a Discord link request names a TapTap user and nothing else", async () => {
	assert.equal(
		await openDiscordLink(await sealDiscordLink("tap:obj1")),
		"tap:obj1",
	);
	assert.equal(
		await openDiscordLink(await sealDiscordLink("123456789012345678")),
		null,
	);
	assert.equal(await openDiscordLink(undefined), null);
	assert.equal(
		await openDiscordLink(await sealTapTicket(LOGIN, { id: "tap:obj1" })),
		null,
	);
});

test("tap user ids and sign-in cookies", () => {
	assert.equal(tapUserId("obj1"), "tap:obj1");
	assert.equal(tapObjectId("tap:obj1"), "obj1");
	assert.equal(tapObjectId("123456789012345678"), undefined);
	assert.equal(isLoginId(LOGIN), true);
	assert.equal(isLoginId("short"), false);
	const headers = new Headers({
		cookie: `phi-locale=en; phi-tap-login=${LOGIN}; other=1`,
	});
	assert.equal(readCookie(headers, "other"), "1");
	assert.equal(tapLoginIdFrom(headers), LOGIN);
	assert.equal(
		tapLoginIdFrom(new Headers({ cookie: "phi-tap-login=../etc" })),
		undefined,
	);
});
