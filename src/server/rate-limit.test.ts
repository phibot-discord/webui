import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clientIp, rateLimit, resetRateLimitForTest } from "./rate-limit";

beforeEach(() => resetRateLimitForTest());

test("a user gets 10 requests per rolling minute", () => {
	const t0 = 1_000_000;
	for (let i = 0; i < 9; i++) {
		assert.equal(rateLimit({ userId: "u", ip: "1.1.1.1" }, t0).ok, true);
	}
	assert.equal(rateLimit({ userId: "u", ip: "1.1.1.1" }, t0 + 20_000).ok, true);
	const blocked = rateLimit({ userId: "u", ip: "1.1.1.1" }, t0 + 30_000);
	assert.equal(blocked.ok, false);
	assert.equal(!blocked.ok && blocked.retryAfter, 30);
	// The window slides: the first nine leave it 60 s after they were made
	for (let i = 0; i < 9; i++) {
		assert.equal(
			rateLimit({ userId: "u", ip: "1.1.1.1" }, t0 + 60_000).ok,
			true,
		);
	}
	assert.equal(
		rateLimit({ userId: "u", ip: "1.1.1.1" }, t0 + 60_000).ok,
		false,
	);
});

test("an IP gets 30 per minute, shared by its users", () => {
	const t0 = 2_000_000;
	for (let i = 0; i < 30; i++) {
		assert.equal(rateLimit({ userId: `u${i}`, ip: "2.2.2.2" }, t0).ok, true);
	}
	assert.equal(rateLimit({ ip: "2.2.2.2" }, t0).ok, false);
	assert.equal(
		rateLimit({ ip: "3.3.3.3" }, t0).ok,
		true,
		"other IPs unaffected",
	);
});

test("a request blocked by the IP check does not use up the user's budget", () => {
	const t0 = 3_000_000;
	for (let i = 0; i < 30; i++) rateLimit({ ip: "4.4.4.4" }, t0);
	for (let i = 0; i < 20; i++) {
		assert.equal(rateLimit({ userId: "v", ip: "4.4.4.4" }, t0).ok, false);
	}
	for (let i = 0; i < 10; i++) {
		assert.equal(rateLimit({ userId: "v", ip: "5.5.5.5" }, t0).ok, true);
	}
});

test("rejected requests are not counted", () => {
	const t0 = 4_000_000;
	for (let i = 0; i < 10; i++) rateLimit({ userId: "w", ip: `6.6.6.${i}` }, t0);
	for (let i = 0; i < 50; i++)
		rateLimit({ userId: "w", ip: "7.7.7.7" }, t0 + 1);
	// Only the ten accepted requests (at t0) were counted, so the user is free again at t0 + 60 s
	assert.equal(rateLimit({ userId: "w", ip: "8.8.8.8" }, t0 + 60_000).ok, true);
});

test("clientIp takes the first forwarded address", () => {
	assert.equal(
		clientIp(new Headers({ "x-forwarded-for": " 9.9.9.9 , 10.0.0.1" })),
		"9.9.9.9",
	);
	assert.equal(clientIp(new Headers({ "x-real-ip": "8.8.8.8" })), "8.8.8.8");
	assert.equal(clientIp(new Headers()), "unknown");
});
