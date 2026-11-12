import { join } from "node:path";
import { readYaml } from "@/phi/lib/files";
import { getInfo, withDotZero } from "@/phi/lib/get-info";
import { runInBackground } from "./background";
import { logger } from "./logger";
import { assetsDir } from "./paths";
import { fetchR2Object, INFO_PREFIX, r2Ready } from "./r2";
import { aliasesSha, ensureSongInfo, loadedCatalogRevision } from "./song-info";

export type AliasLayer = "base" | "approved";
export type AliasEntry = { text: string; layer: AliasLayer };

export type AliasIndex = {
	rev: string;
	byId: ReadonlyMap<string, readonly AliasEntry[]>;
	approvedSha?: string;
	approvedAt?: string;
	stale: boolean;
};

export type ApprovedSnapshot = {
	sha: string;
	fetchedAt?: string;
	data: Record<string, string[]>;
};

export type AliasDeps = {
	ensureCatalog: () => Promise<void>;
	catalogRevision: () => string;
	aliasesSha: () => string | undefined;
	readBase: () => unknown;
	getApproved: () => Promise<Buffer | undefined>;
	known: (id: string) => boolean;
	background: (work: Promise<unknown>) => void;
	now: () => number;
	coldWaitMs: number;
};

const COLD_WAIT_MS = 2_500;
const RETRY_MS = 60_000;
export const ALIAS_MAX_LEN = 64;

const ALIASES_R2_KEY = `${INFO_PREFIX}/aliases.json`;

function errText(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function invalid(why: string): never {
	throw new Error(`invalid alias snapshot: ${why}`);
}

/** Like phi-plugin's `validateApprovedAliasSnapshot`: any bad entry rejects the whole snapshot */
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

/** Aliases are `String()`-coerced: the bundled yaml has a bare `7` */
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

type AliasState = {
	baseRev?: string;
	base?: unknown;
	approved?: ApprovedSnapshot;
	loadedFor?: string;
	retryAt: number;
	loading?: Promise<void>;
	index?: Omit<AliasIndex, "stale">;
};

function freshState(): AliasState {
	return { retryAt: 0 };
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

const defaultDeps: AliasDeps = {
	ensureCatalog: ensureSongInfo,
	catalogRevision: loadedCatalogRevision,
	aliasesSha,
	readBase: () =>
		readYaml<unknown>(join(assetsDir(), "info", "nicklist.yaml"), {}),
	getApproved: async () =>
		r2Ready()
			? fetchR2Object(ALIASES_R2_KEY, {
					cache: "no-store",
					negative: false,
				})
			: undefined,
	known,
	background: (work) =>
		runInBackground(work, (err) =>
			logger.warn(`aliases background failed: ${errText(err)}`),
		),
	now: Date.now,
	coldWaitMs: COLD_WAIT_MS,
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
