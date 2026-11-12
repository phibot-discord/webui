export const PICK_MEMORY = 10;

export function pickKey(
	keys: readonly string[],
	recent: readonly string[],
	rnd: () => number = Math.random,
): string | undefined {
	if (!keys.length) return undefined;
	const avoid = new Set(recent);
	const fresh = keys.filter((k) => !avoid.has(k));
	const pool = fresh.length ? fresh : keys;
	return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
}

export function rememberPick(
	recent: readonly string[],
	key: string,
	total: number,
): string[] {
	const keep = Math.max(0, Math.min(PICK_MEMORY, total - 1));
	const next = [...recent.filter((k) => k !== key), key];
	return keep ? next.slice(-keep) : [];
}
