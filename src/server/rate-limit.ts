import { kvKey } from "@/phi/lib/const";

type KvCounter = {
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<unknown>;
};

const USER_PER_MIN = 10;
const IP_PER_MIN = 30;

export async function rateLimit(
	kv: KvCounter,
	opts: { userId?: string; ip: string },
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
	const window = Math.floor(Date.now() / 60_000);
	const ipKey = kvKey("webRl", "ip", opts.ip, window);
	const ipN = await kv.incr(ipKey);
	if (ipN === 1) await kv.expire(ipKey, 60);
	if (ipN > IP_PER_MIN) return { ok: false, retryAfter: 60 };

	if (opts.userId) {
		const userKey = kvKey("webRl", "user", opts.userId, window);
		const userN = await kv.incr(userKey);
		if (userN === 1) await kv.expire(userKey, 60);
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
