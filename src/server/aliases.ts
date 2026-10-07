import { join } from "node:path";
import {
	isProxyHost,
	PHI_CHART_TAG_API,
	PHI_PROXY_KEY,
	PROXY_KEY_HEADER,
} from "@/phi/lib/const";
import { readYaml } from "@/phi/lib/files";
import { getInfo, withDotZero } from "@/phi/lib/get-info";
import { runInBackground } from "./background";
import { logger } from "./logger";
import { outgoingFetch } from "./outgoing";
import { assetsDir } from "./paths";
import { fetchR2Object, r2Ready } from "./r2";
import { aliasesSha, ensureSongInfo, loadedCatalogRevision } from "./song-info";

/** Song nicknames: bundled nicklist.yaml, then ill-sync's approved snapshot; deduped per song */
export type AliasLayer = "base" | "approved";
export type AliasEntry = { text: string; layer: AliasLayer };

export type AliasIndex = {
	/** Changes with the catalog and with the approved snapshot */
	rev: string;
	byId: ReadonlyMap<string, readonly AliasEntry[]>;
	approvedSha?: string;
	approvedAt?: string;
	/** ill-sync published a snapshot this index does not include (yet) */
	stale: boolean;
};

export type ApprovedSnapshot = {
	sha: string;
	fetchedAt?: string;
	data: Record<string, string[]>;
};

export type AliasDeps = {
	ensureCatalog: () => Promise<void>;
	/** Revision of the catalog `known` checks against (what `getInfo` holds) */
	catalogRevision: () => string;
	/** `aliasesSha` from `_sync/info.json` */
	aliasesSha: () => string | undefined;
	readBase: () => unknown;
	getApproved: () => Promise<Buffer | undefined>;
	known: (id: string) => boolean;
	fetchResolve: (
		alias: string,
	) => Promise<{ status: number; body: unknown } | undefined>;
	background: (work: Promise<unknown>) => void;
	now: () => number;
	coldWaitMs: number;
	liveBudgetMs: number;
};

const COLD_WAIT_MS = 2_500;
const RETRY_MS = 60_000;
const LIVE_BUDGET_MS = 3_000;
/** Past the caller's budget the answer only fills the cache; don't hold the function long */
const LIVE_FETCH_MS = 8_000;
const LIVE_HIT_TTL_MS = 6 * 60 * 60 * 1000;
const LIVE_MISS_TTL_MS = 15 * 60 * 1000;
const LIVE_ERROR_TTL_MS = 60_000;
/** The Worker has no alias route (404) or rejects the key (401/403) */
const LIVE_OFF_MS = 15 * 60 * 1000;
/** Upstream 5xx or timeouts in a row: stop asking for a minute */
const LIVE_BREAKER_AFTER = 3;
const LIVE_BREAKER_MS = 60_000;
const LIVE_MAX = 1_000;
const LIVE_PER_MIN = 30;
/** One client (IP) cannot spend the whole per-minute budget */
const LIVE_PER_CLIENT_MIN = 10;
export const ALIAS_MAX_LEN = 64;

export function aliasesR2Key(
	prefix = process.env.CLOUDFLARE_R2_INFO_PREFIX ?? "info",
): string {
	return `${prefix.replace(/\/+$/, "")}/aliases.json`;
}

function errText(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function invalid(why: string): never {
	throw new Error(`invalid alias snapshot: ${why}`);
}

/**
 * ill-sync's `info/aliases.json`. Any bad entry rejects the whole snapshot
 * (phi-plugin's `validateApprovedAliasSnapshot`), so the last good one stays
 */
export function parseApprovedSnapshot(raw: unknown): ApprovedSnapshot {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		invalid("not an object");
	}
	const body = raw as Record<string, unknown>;
	if (body.v !== 1) invalid(`version ${String(body.v)}`);
	const sha = body.sha;
	if (typeof sha !== "string" || !sha) invalid("no sha");
	const data = body.data;
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		invalid("no data");
	}
	const out: Record<string, string[]> = {};
	for (const [id, aliases] of Object.entries(data)) {
		if (!id.trim()) invalid("blank song id");
		if (!Array.isArray(aliases)) invalid(`${id} is not a list`);
		out[id] = aliases.map((alias: unknown) => {
			if (typeof alias !== "string" || !alias.trim()) {
				invalid(`${id} has a blank alias`);
			}
			return alias.trim();
		});
	}
	return {
		sha,
		fetchedAt: typeof body.fetchedAt === "string" ? body.fetchedAt : undefined,
		data: out,
	};
}

/**
 * Layers in order; ids get `.0`, aliases are `String()`-coerced (the bundled
 * yaml has a bare `7`) and trimmed, and ids the catalog lacks are dropped
 */
export function mergeAliasLayers(
	layers: readonly { layer: AliasLayer; data: unknown }[],
	known: (id: string) => boolean,
): { byId: Map<string, AliasEntry[]>; orphans: string[] } {
	const byId = new Map<string, AliasEntry[]>();
	const seen = new Map<string, Set<string>>();
	const orphans = new Set<string>();
	for (const { layer, data } of layers) {
		if (!data || typeof data !== "object" || Array.isArray(data)) continue;
		for (const [rawId, aliases] of Object.entries(data)) {
			const trimmed = rawId.trim();
			if (!trimmed || !Array.isArray(aliases)) continue;
			const id = withDotZero(trimmed);
			if (!known(id)) {
				orphans.add(trimmed);
				continue;
			}
			let list = byId.get(id);
			let keys = seen.get(id);
			if (!list || !keys) {
				list = [];
				keys = new Set();
				byId.set(id, list);
				seen.set(id, keys);
			}
			for (const raw of aliases) {
				if (raw == null) continue;
				const text = String(raw).trim();
				const key = text.toLowerCase();
				if (!text || keys.has(key)) continue;
				keys.add(key);
				list.push({ text, layer });
			}
		}
	}
	for (const [id, list] of byId) if (!list.length) byId.delete(id);
	return { byId, orphans: [...orphans] };
}

type LiveResult = { status: LiveStatus; ids: string[] };
export type LiveStatus =
	| "skipped"
	| "hit"
	| "miss"
	| "timeout"
	| "error"
	| "off";

type AliasState = {
	baseRev?: string;
	base?: unknown;
	approved?: ApprovedSnapshot;
	/** `aliasesSha` the approved layer was last fetched for */
	loadedFor?: string;
	retryAt: number;
	loading?: Promise<void>;
	index?: Omit<AliasIndex, "stale">;
	live: Map<string, { until: number; result: LiveResult }>;
	liveInflight: Map<string, Promise<LiveResult>>;
	liveOffUntil: number;
	liveFailures: number;
	liveWindow: number;
	liveCount: number;
	liveClients: Map<string, number>;
};

function freshState(): AliasState {
	return {
		retryAt: 0,
		live: new Map(),
		liveInflight: new Map(),
		liveOffUntil: 0,
		liveFailures: 0,
		liveWindow: 0,
		liveCount: 0,
		liveClients: new Map(),
	};
}

// Shared by every route bundle in the process, like `getInfo`
const g = globalThis as typeof globalThis & { __phiAliases?: AliasState };
function state(): AliasState {
	g.__phiAliases ??= freshState();
	return g.__phiAliases;
}

function known(id: string): boolean {
	return id in getInfo.ori_info || id in getInfo.sp_info;
}

async function fetchResolve(
	alias: string,
): Promise<{ status: number; body: unknown }> {
	const url = `${PHI_CHART_TAG_API}/aliases/resolve?alias=${encodeURIComponent(alias)}`;
	const headers: Record<string, string> = { Accept: "application/json" };
	if (PHI_PROXY_KEY && isProxyHost(url))
		headers[PROXY_KEY_HEADER] = PHI_PROXY_KEY;
	const res = await outgoingFetch(url, {
		headers,
		signal: AbortSignal.timeout(LIVE_FETCH_MS),
	});
	const json = (res.headers.get("content-type") ?? "").includes("json");
	const body = json ? await res.json().catch(() => undefined) : undefined;
	if (!json) await res.text().catch(() => "");
	return { status: res.status, body };
}

const defaultDeps: AliasDeps = {
	ensureCatalog: ensureSongInfo,
	catalogRevision: loadedCatalogRevision,
	aliasesSha,
	readBase: () =>
		readYaml<unknown>(join(assetsDir(), "info", "nicklist.yaml"), {}),
	getApproved: async () =>
		r2Ready()
			? // A 404 cached for 15 min would hide the first upload; aliasesSha already gates this
				fetchR2Object(aliasesR2Key(), { cache: "no-store", negative: false })
			: undefined,
	known,
	fetchResolve,
	background: (work) =>
		runInBackground(work, (err) =>
			logger.warn(`aliases background failed: ${errText(err)}`),
		),
	now: Date.now,
	coldWaitMs: COLD_WAIT_MS,
	liveBudgetMs: LIVE_BUDGET_MS,
};

let deps = defaultDeps;

export function setAliasDepsForTest(overrides: Partial<AliasDeps>) {
	deps = { ...defaultDeps, ...overrides };
}

export function resetAliasesForTest() {
	deps = defaultDeps;
	g.__phiAliases = freshState();
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, ms);
		timer.unref?.();
	});
}

/** By `fetchedAt`; snapshots without one are never called older */
function isOlder(a: ApprovedSnapshot, b: ApprovedSnapshot): boolean {
	const at = Date.parse(a.fetchedAt ?? "");
	const bt = Date.parse(b.fetchedAt ?? "");
	return Number.isFinite(at) && Number.isFinite(bt) && at < bt;
}

async function loadApproved(want: string): Promise<void> {
	const st = state();
	try {
		const buf = await deps.getApproved();
		if (!buf?.byteLength) throw new Error("aliases.json missing");
		const snap = parseApprovedSnapshot(JSON.parse(buf.toString("utf8")));
		if (snap.sha === want) {
			st.approved = snap;
			st.loadedFor = want;
			st.retryAt = 0;
			return;
		}
		// ill-sync writes aliases.json before _sync/info.json: stay `stale` until they agree, refetching an older file
		logger.warn(
			`aliases: aliases.json sha ${snap.sha.slice(0, 12)} != _sync aliasesSha ${want.slice(0, 12)}`,
		);
		const kept = st.approved;
		if (!kept || !isOlder(snap, kept)) st.approved = snap;
		st.loadedFor = st.approved?.sha;
		st.retryAt = deps.now() + RETRY_MS;
	} catch (err) {
		st.retryAt = deps.now() + RETRY_MS;
		logger.warn(`aliases: approved layer kept/skipped: ${errText(err)}`);
	}
}

function readBase(): unknown {
	try {
		return deps.readBase();
	} catch (err) {
		logger.warn(`aliases: nicklist.yaml skipped: ${errText(err)}`);
		return {};
	}
}

function currentIndex(want: string | undefined): AliasIndex {
	const st = state();
	const catalogRev = deps.catalogRevision();
	if (st.baseRev !== catalogRev) {
		st.base = readBase();
		st.baseRev = catalogRev;
		st.index = undefined;
	}
	const approved = st.approved;
	const rev = `${catalogRev}|${approved ? approved.sha : "base"}`;
	if (st.index?.rev !== rev) {
		const { byId, orphans } = mergeAliasLayers(
			[
				{ layer: "base", data: st.base },
				...(approved
					? [{ layer: "approved" as const, data: approved.data }]
					: []),
			],
			deps.known,
		);
		let count = 0;
		for (const list of byId.values()) count += list.length;
		logger.info(
			`aliases: ${byId.size} songs, ${count} aliases${approved ? ` (approved ${approved.sha.slice(0, 8)})` : " (bundled only)"}${orphans.length ? `; ${orphans.length} ids not in the catalog: ${orphans.slice(0, 3).join(", ")}${orphans.length > 3 ? ", …" : ""}` : ""}`,
		);
		st.index = {
			rev,
			byId,
			approvedSha: approved?.sha,
			approvedAt: approved?.fetchedAt,
		};
	}
	return { ...st.index, stale: want != null && want !== st.loadedFor };
}

/** Stale-while-revalidate; the first call waits `coldWaitMs`, then serves the bundled layer */
export async function ensureAliases(): Promise<AliasIndex> {
	await deps.ensureCatalog();
	const st = state();
	const want = deps.aliasesSha();
	if (
		want &&
		want !== st.loadedFor &&
		!st.loading &&
		deps.now() >= st.retryAt
	) {
		const job = loadApproved(want).finally(() => {
			if (st.loading === job) st.loading = undefined;
		});
		st.loading = job;
		deps.background(job);
	}
	if (!st.index && st.loading) {
		await Promise.race([st.loading, wait(deps.coldWaitMs)]);
	}
	return currentIndex(want);
}

/** Cache key for the live resolve: upstream trims and ignores case, but does not apply NFKC */
export function liveAliasKey(q: string): string {
	return q.trim().toLowerCase();
}

function remember(key: string, result: LiveResult, ttl: number) {
	const live = state().live;
	live.delete(key);
	live.set(key, { until: deps.now() + ttl, result });
	while (live.size > LIVE_MAX) {
		const oldest = live.keys().next().value;
		if (oldest === undefined) break;
		live.delete(oldest);
	}
}

function liveIds(body: unknown): string[] | undefined {
	const items = (body as { items?: unknown } | undefined)?.items;
	if (!Array.isArray(items)) return;
	const ids = new Set<string>();
	for (const item of items) {
		const id = (item as { songId?: unknown } | null)?.songId;
		if (typeof id === "string" && id.trim()) ids.add(withDotZero(id.trim()));
	}
	return [...ids];
}

function liveOff(ms: number, why: string) {
	const st = state();
	if (deps.now() >= st.liveOffUntil) {
		logger.warn(`aliases: live resolve off for ${ms / 1000} s (${why})`);
	}
	st.liveOffUntil = Math.max(st.liveOffUntil, deps.now() + ms);
}

async function fetchLive(alias: string, key: string): Promise<LiveResult> {
	const st = state();
	try {
		const res = await deps.fetchResolve(alias);
		if (!res) return { status: "off", ids: [] };
		if (res.status === 401 || res.status === 403 || res.status === 404) {
			// Today's Worker has no alias route; don't ask again per query
			liveOff(LIVE_OFF_MS, String(res.status));
			return { status: "off", ids: [] };
		}
		if (res.status === 400) {
			st.liveFailures = 0;
			const miss: LiveResult = { status: "miss", ids: [] };
			remember(key, miss, LIVE_MISS_TTL_MS);
			return miss;
		}
		const ids = res.status === 200 ? liveIds(res.body) : undefined;
		if (!ids) throw new Error(`resolve ${res.status}`);
		st.liveFailures = 0;
		const result: LiveResult = { status: ids.length ? "hit" : "miss", ids };
		remember(key, result, ids.length ? LIVE_HIT_TTL_MS : LIVE_MISS_TTL_MS);
		return result;
	} catch (err) {
		logger.warn(`aliases: live resolve failed: ${errText(err)}`);
		st.liveFailures += 1;
		if (st.liveFailures >= LIVE_BREAKER_AFTER) {
			st.liveFailures = 0;
			liveOff(LIVE_BREAKER_MS, `${LIVE_BREAKER_AFTER} failures in a row`);
		}
		const result: LiveResult = { status: "error", ids: [] };
		remember(key, result, LIVE_ERROR_TTL_MS);
		return result;
	}
}

function takeLiveBudget(client: string | undefined): boolean {
	const st = state();
	const window = Math.floor(deps.now() / 60_000);
	if (st.liveWindow !== window) {
		st.liveWindow = window;
		st.liveCount = 0;
		st.liveClients.clear();
	}
	if (st.liveCount >= LIVE_PER_MIN) return false;
	const used = client ? (st.liveClients.get(client) ?? 0) : 0;
	if (used >= LIVE_PER_CLIENT_MIN) return false;
	st.liveCount += 1;
	if (client) st.liveClients.set(client, used + 1);
	return true;
}

/** phib19's /aliases/resolve via the Worker for aliases newer than the mirror: cached, single-flight, rate-capped */
export async function resolveAliasLive(
	q: string,
	client?: string,
): Promise<LiveResult> {
	const alias = q.trim();
	if (!alias || alias.length > ALIAS_MAX_LEN)
		return { status: "skipped", ids: [] };
	const key = liveAliasKey(alias);
	const st = state();
	const cached = st.live.get(key);
	if (cached && cached.until > deps.now()) {
		st.live.delete(key);
		st.live.set(key, cached);
		return cached.result;
	}
	if (deps.now() < st.liveOffUntil) return { status: "off", ids: [] };
	let job = st.liveInflight.get(key);
	if (!job) {
		if (!takeLiveBudget(client)) return { status: "skipped", ids: [] };
		const started = fetchLive(alias, key).finally(() => {
			st.liveInflight.delete(key);
		});
		st.liveInflight.set(key, started);
		deps.background(started);
		job = started;
	}
	const timeout = wait(deps.liveBudgetMs).then(
		(): LiveResult => ({ status: "timeout", ids: [] }),
	);
	return Promise.race([job, timeout]);
}
