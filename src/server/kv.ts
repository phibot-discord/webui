import { logger } from "./logger";
import type { Kv } from "./sdk";

type KvSetOptions = { ttlMs?: number; nx?: boolean };
type Envelope = { d: string; e?: number };
type ZMap = Record<string, number>;

export type KvConfig = {
	accountId: string;
	namespaceId: string;
	apiToken: string;
};

export type KvSortedItem = { score: number; value: string };

export type KvStore = {
	get: (key: string) => Promise<string | null>;
	set: (
		key: string,
		value: unknown,
		options?: KvSetOptions,
	) => Promise<string | null>;
	del: (...keys: Array<string | string[]>) => Promise<number>;
	keys: (pattern?: string) => Promise<string[]>;
	incr: (key: string) => Promise<number>;
	expire: (key: string, seconds: number) => Promise<number>;
	ttlMs: (key: string) => Promise<number>;
	sortedAdd: (key: string, item: KvSortedItem) => Promise<number>;
	sortedRemove: (key: string, value: string) => Promise<number>;
	sortedRank: (key: string, value: string) => Promise<number | null>;
	sortedScore: (key: string, value: string) => Promise<number | null>;
	sortedRange: (key: string, min: number, max: number) => Promise<string[]>;
	sortedCount: (key: string, min: number, max: number) => Promise<number>;
	sortedSize: (key: string) => Promise<number>;
};

export type KvBundle = {
	store: KvStore;
	db: Kv;
};

const CF_MIN_TTL_SEC = 60;

function asString(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

function parseEnvelope(raw: string): Envelope {
	if (raw.startsWith("{")) {
		try {
			const parsed = JSON.parse(raw) as { d?: unknown; e?: unknown };
			if (typeof parsed.d === "string") {
				return {
					d: parsed.d,
					e: typeof parsed.e === "number" ? parsed.e : undefined,
				};
			}
		} catch {
			/* raw string */
		}
	}
	return { d: raw };
}

function encodeEnvelope(env: Envelope): string {
	return JSON.stringify(env);
}

function alive(env: Envelope | undefined, now = Date.now()): env is Envelope {
	if (!env) return false;
	return env.e == null || env.e > now;
}

function remainingMs(env: Envelope | undefined, now = Date.now()): number {
	if (!env) return -2;
	if (env.e == null) return -1;
	const n = env.e - now;
	return n > 0 ? n : -2;
}

function globToPrefix(pattern: string): string {
	const star = pattern.indexOf("*");
	return star === -1 ? pattern : pattern.slice(0, star);
}

function globToRegExp(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*");
	return new RegExp(`^${escaped}$`);
}

function sortedMembers(map: ZMap): string[] {
	return Object.entries(map)
		.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
		.map(([value]) => value);
}

function parseZMap(raw: string | null): ZMap {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
			return parsed as ZMap;
	} catch {
		/* empty */
	}
	return {};
}

type RemoteKv = {
	label: string;
	getRaw: (key: string) => Promise<string | undefined>;
	putRaw: (key: string, value: string, ttlSec?: number) => Promise<void>;
	delRaw: (key: string) => Promise<void>;
	listRaw: (prefix: string) => Promise<string[]>;
	ping: () => Promise<void>;
};

function restRemote(cfg: KvConfig): RemoteKv {
	const accountId = cfg.accountId.trim();
	const namespaceId = cfg.namespaceId.trim();
	const apiToken = cfg.apiToken.trim();
	if (!accountId || !namespaceId || !apiToken) {
		throw new Error(
			"Cloudflare KV is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_NAMESPACE_ID, and CLOUDFLARE_API_TOKEN.",
		);
	}
	const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
	const headers = { Authorization: `Bearer ${apiToken}` };

	const kvFetch = async (
		url: string,
		init?: RequestInit,
		attempt = 0,
	): Promise<Response> => {
		const res = await fetch(url, init);
		if (res.status === 429 && attempt < 4) {
			await new Promise((resolve) => setTimeout(resolve, 1100 * (attempt + 1)));
			return kvFetch(url, init, attempt + 1);
		}
		return res;
	};

	return {
		label: namespaceId,
		getRaw: async (key) => {
			const res = await kvFetch(`${base}/values/${encodeURIComponent(key)}`, {
				headers,
			});
			if (res.status === 404) return undefined;
			if (!res.ok) {
				const text = await res.text().catch(() => "");
				throw new Error(
					`KV GET ${key} failed: ${res.status} ${text}`.slice(0, 500),
				);
			}
			return (await res.text()) || undefined;
		},
		putRaw: async (key, value, ttlSec) => {
			const url = ttlSec
				? `${base}/values/${encodeURIComponent(key)}?expiration_ttl=${ttlSec}`
				: `${base}/values/${encodeURIComponent(key)}`;
			const res = await kvFetch(url, {
				method: "PUT",
				headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
				body: value,
			});
			if (!res.ok) {
				const text = await res.text().catch(() => "");
				throw new Error(
					`KV PUT ${key} failed: ${res.status} ${text}`.slice(0, 500),
				);
			}
		},
		delRaw: async (key) => {
			const res = await kvFetch(`${base}/values/${encodeURIComponent(key)}`, {
				method: "DELETE",
				headers,
			});
			if (!res.ok && res.status !== 404) {
				const text = await res.text().catch(() => "");
				throw new Error(
					`KV DELETE ${key} failed: ${res.status} ${text}`.slice(0, 500),
				);
			}
		},
		listRaw: async (prefix) => {
			const names: string[] = [];
			let cursor = "";
			for (;;) {
				const params = new URLSearchParams({ limit: "1000" });
				if (prefix) params.set("prefix", prefix);
				if (cursor) params.set("cursor", cursor);
				const res = await kvFetch(`${base}/keys?${params}`, { headers });
				if (!res.ok) {
					const text = await res.text().catch(() => "");
					throw new Error(
						`KV LIST failed: ${res.status} ${text}`.slice(0, 500),
					);
				}
				const body = (await res.json()) as {
					success?: boolean;
					result?: { name: string }[];
					result_info?: { cursor?: string };
				};
				if (!body.success) throw new Error("KV LIST failed");
				for (const item of body.result || []) names.push(item.name);
				const next = body.result_info?.cursor;
				if (!next) break;
				cursor = next;
			}
			return names;
		},
		ping: async () => {
			const res = await kvFetch(`${base}/keys?limit=10`, { headers });
			if (!res.ok) {
				const text = await res.text().catch(() => "");
				throw new Error(`KV ping failed: ${res.status} ${text}`.slice(0, 400));
			}
		},
	};
}

export async function connectKv(cfg: KvConfig): Promise<KvBundle> {
	const remote = restRemote(cfg);
	const overlay = new Map<string, Envelope>();
	const writeTail = new Map<string, Promise<unknown>>();

	const enqueue = <T>(key: string, fn: () => Promise<T>): Promise<T> => {
		const prev = writeTail.get(key) ?? Promise.resolve();
		const next = prev.then(fn, fn);
		writeTail.set(
			key,
			next.then(
				() => undefined,
				() => undefined,
			),
		);
		return next;
	};

	const putRemote = async (key: string, envl: Envelope) => {
		const ttlSec =
			envl.e != null
				? Math.max(CF_MIN_TTL_SEC, Math.ceil((envl.e - Date.now()) / 1000))
				: undefined;
		await remote.putRaw(key, encodeEnvelope(envl), ttlSec);
	};

	const delRemote = (key: string) => remote.delRaw(key);

	const getRemote = async (key: string): Promise<Envelope | undefined> => {
		const raw = await remote.getRaw(key);
		if (!raw) return undefined;
		const envl = parseEnvelope(raw);
		if (!alive(envl)) {
			overlay.delete(key);
			void delRemote(key);
			return undefined;
		}
		overlay.set(key, envl);
		return envl;
	};

	const listRemote = (prefix: string) => remote.listRaw(prefix);

	const read = async (key: string): Promise<Envelope | undefined> => {
		const local = overlay.get(key);
		if (alive(local)) return local;
		if (local) overlay.delete(key);
		return getRemote(key);
	};

	const write = async (
		key: string,
		value: unknown,
		options?: KvSetOptions,
	): Promise<string | null> => {
		const ttlMs = options?.ttlMs;
		const env: Envelope = {
			d: asString(value),
			e: ttlMs != null ? Date.now() + ttlMs : undefined,
		};
		return enqueue(key, async () => {
			if (options?.nx) {
				const existing = await read(key);
				if (existing) return null;
			}
			overlay.set(key, env);
			await putRemote(key, env);
			return "OK";
		});
	};

	const get = async (key: string): Promise<string | null> => {
		const env = await read(key);
		return env ? env.d : null;
	};

	const del = async (...keys: Array<string | string[]>): Promise<number> => {
		const flat = keys.flat().filter(Boolean);
		let n = 0;
		for (const key of flat) {
			overlay.delete(key);
			await enqueue(key, () => delRemote(key));
			n += 1;
		}
		return n;
	};

	const keys = async (pattern = "*"): Promise<string[]> => {
		const re = globToRegExp(pattern);
		const prefix = globToPrefix(pattern);
		const listed = await listRemote(prefix === "*" ? "" : prefix);
		const names = new Set<string>(listed.filter((name) => re.test(name)));
		const now = Date.now();
		for (const [key, env] of overlay) {
			if (!alive(env, now)) {
				overlay.delete(key);
				continue;
			}
			if (re.test(key)) names.add(key);
		}
		return [...names];
	};

	const loadZ = async (key: string): Promise<ZMap> => parseZMap(await get(key));
	const saveZ = async (key: string, map: ZMap) => {
		await write(key, JSON.stringify(map));
	};

	const store: KvStore = {
		get,
		set: write,
		del,
		keys,
		incr: async (key) => {
			return enqueue(key, async () => {
				const env = await read(key);
				const n = Number(env?.d || 0) + 1;
				const next: Envelope = { d: String(n), e: env?.e };
				overlay.set(key, next);
				await putRemote(key, next);
				return n;
			});
		},
		expire: async (key, seconds) => {
			const env = await read(key);
			if (!env) return 0;
			await write(key, env.d, { ttlMs: seconds * 1000 });
			return 1;
		},
		ttlMs: async (key) => remainingMs(await read(key)),
		sortedAdd: async (key, item) => {
			const map = await loadZ(key);
			const existed = Object.hasOwn(map, item.value);
			map[item.value] = Number(item.score);
			await saveZ(key, map);
			return existed ? 0 : 1;
		},
		sortedRemove: async (key, value) => {
			const map = await loadZ(key);
			if (!Object.hasOwn(map, value)) return 0;
			delete map[value];
			await saveZ(key, map);
			return 1;
		},
		sortedRank: async (key, value) => {
			const rank = sortedMembers(await loadZ(key)).indexOf(value);
			return rank < 0 ? null : rank;
		},
		sortedScore: async (key, value) => {
			const map = await loadZ(key);
			return Object.hasOwn(map, value) ? (map[value] ?? null) : null;
		},
		sortedRange: async (key, min, max) => {
			const members = sortedMembers(await loadZ(key));
			const start = min < 0 ? Math.max(0, members.length + min) : min;
			const end = max < 0 ? members.length + max + 1 : max + 1;
			return members.slice(start, end);
		},
		sortedCount: async (key, min, max) => {
			return Object.values(await loadZ(key)).filter(
				(score) => score >= min && score <= max,
			).length;
		},
		sortedSize: async (key) => Object.keys(await loadZ(key)).length,
	};

	const db: Kv = {
		get: async (key) => (await get(key)) ?? undefined,
		set: async (key, value, ttlMs) => {
			await write(key, value, ttlMs ? { ttlMs } : undefined);
		},
		del: async (key) => {
			await del(key);
		},
		keys: (prefix = "") => keys(prefix ? `${prefix}*` : "*"),
		ping: async () => {
			await remote.ping();
			return "PONG";
		},
		close: async () => undefined,
	};

	const pong = await db.ping();
	logger.ok(`kv ${pong} ${remote.label}`);
	return { store, db };
}
