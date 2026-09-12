export const REFRESH_COOLDOWN_MS = 120_000;
export const BYPASS_CACHE_COOLDOWN_MS = 5 * 60 * 1000;

export type CooldownStore = {
	set: (
		key: string,
		value: unknown,
		opts?: { nx?: boolean; ttlMs?: number },
	) => Promise<string | null>;
	ttlMs: (key: string) => Promise<number>;
};

export type CooldownClaim = { ok: boolean; remainMs: number };

export async function cooldownRemaining(
	store: Pick<CooldownStore, "ttlMs">,
	key: string,
): Promise<number> {
	const n = await store.ttlMs(key);
	return n > 0 ? n : 0;
}

export async function claimCooldown(
	store: CooldownStore,
	key: string,
	ttlMs: number,
): Promise<CooldownClaim> {
	const locked = await store.set(key, "1", { nx: true, ttlMs });
	if (locked !== "OK") {
		const remain = await cooldownRemaining(store, key);
		return { ok: false, remainMs: remain > 0 ? remain : ttlMs };
	}
	const remain = await cooldownRemaining(store, key);
	return { ok: true, remainMs: remain > 0 ? remain : ttlMs };
}

export function retryAfterSec(remainMs: number) {
	return Math.max(1, Math.ceil(remainMs / 1000));
}
