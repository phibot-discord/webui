import assert from "node:assert/strict";
import test from "node:test";
import {
	BYPASS_CACHE_COOLDOWN_MS,
	claimCooldown,
	cooldownRemaining,
	retryAfterSec,
} from "./cooldown";

function memStore() {
	const map = new Map<string, { exp: number }>();
	return {
		async set(
			key: string,
			_value: unknown,
			opts?: { nx?: boolean; ttlMs?: number },
		) {
			const now = Date.now();
			const cur = map.get(key);
			if (opts?.nx && cur && cur.exp > now) return null;
			map.set(key, {
				exp: opts?.ttlMs != null ? now + opts.ttlMs : Number.POSITIVE_INFINITY,
			});
			return "OK";
		},
		async ttlMs(key: string) {
			const cur = map.get(key);
			if (!cur) return 0;
			const n = cur.exp - Date.now();
			return n > 0 ? n : 0;
		},
	};
}

test("claimCooldown locks on the store and reports remaining from ttl", async () => {
	const store = memStore();
	const first = await claimCooldown(store, "k", 5_000);
	assert.equal(first.ok, true);
	assert.ok(first.remainMs > 4_000);
	assert.ok(first.remainMs <= 5_000);
	assert.equal(retryAfterSec(first.remainMs), Math.ceil(first.remainMs / 1000));
});

test("claimCooldown rejects a second claim until ttl expires", async () => {
	const store = memStore();
	await claimCooldown(store, "k", 60_000);
	const second = await claimCooldown(store, "k", 60_000);
	assert.equal(second.ok, false);
	assert.ok(second.remainMs > 0);
	assert.ok(second.remainMs <= 60_000);
	assert.equal(retryAfterSec(second.remainMs) >= 1, true);
});

test("cooldownRemaining is 0 when unlocked", async () => {
	const store = memStore();
	assert.equal(await cooldownRemaining(store, "missing"), 0);
});

test("bypass cache cooldown is 5 minutes", () => {
	assert.equal(BYPASS_CACHE_COOLDOWN_MS, 5 * 60 * 1000);
});
