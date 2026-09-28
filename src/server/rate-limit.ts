import { kvKey } from "@/phi/lib/const";

type KvCounter = {
	incr(
		key: string,
		options?: { ttlMs?: number; blocking?: boolean },
	): Promise<number>;
};

const USER_PER_MIN = 10;
const IP_PER_MIN = 30;
const WINDOW_MS = 60_000;

export async function rateLimit(
	kv: KvCounter,
	opts: { userId?: string; ip: string },
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
	const window = Math.floor(Date.now() / WINDOW_MS);
	const bump = (key: string) =>
		kv.incr(key, { ttlMs: WINDOW_MS, blocking: false });
	const ipN = await bump(kvKey("webRl", "ip", opts.ip, window));
	if (ipN > IP_PER_MIN) return { ok: false, retryAfter: 60 };

	if (opts.userId) {
		const userN = await bump(kvKey("webRl", "user", opts.userId, window));
		if (userN > USER_PER_MIN) return { ok: false, retryAfter: 60 };
	}
	return { ok: true };
}

export function clientIp(headers: Headers): string {
	const forwarded = headers.get("x-forwarded-for");
	if (forwarded) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) return first;
	}
	return headers.get("x-real-ip")?.trim() || "unknown";
}
