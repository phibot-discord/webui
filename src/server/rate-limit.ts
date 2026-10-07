const USER_PER_MIN = 10;
const IP_PER_MIN = 30;
const WINDOW_MS = 60_000;
const KEYS_MAX = 10_000;

/** Per-instance sliding window (the old KV counters were per instance in practice too) */
const hits = new Map<string, number[]>();

function take(
	key: string,
	limit: number,
	now: number,
): { ok: true } | { ok: false; retryAfter: number } {
	const since = now - WINDOW_MS;
	const prev = hits.get(key) ?? [];
	const live =
		prev[0] != null && prev[0] <= since ? prev.filter((t) => t > since) : prev;
	if (live.length >= limit) {
		hits.set(key, live);
		const oldest = live[0] ?? now;
		return {
			ok: false,
			retryAfter: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
		};
	}
	live.push(now);
	hits.delete(key);
	hits.set(key, live);
	while (hits.size > KEYS_MAX) {
		const oldest = hits.keys().next().value;
		if (oldest === undefined) break;
		hits.delete(oldest);
	}
	return { ok: true };
}

export function rateLimit(
	opts: { userId?: string; ip: string },
	now = Date.now(),
): { ok: true } | { ok: false; retryAfter: number } {
	const ip = take(`ip:${opts.ip}`, IP_PER_MIN, now);
	if (!ip.ok) return ip;
	if (opts.userId) return take(`user:${opts.userId}`, USER_PER_MIN, now);
	return ip;
}

export function resetRateLimitForTest() {
	hits.clear();
}

export function clientIp(headers: Headers): string {
	const forwarded = headers.get("x-forwarded-for");
	if (forwarded) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) return first;
	}
	return headers.get("x-real-ip")?.trim() || "unknown";
}
