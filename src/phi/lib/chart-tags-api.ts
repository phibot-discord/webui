import { createHash } from "node:crypto";
import { Agent, fetch as undiciFetch } from "undici";
import { logger } from "@/server/logger";
import type { Kv } from "@/server/sdk";
import {
	type B30Record,
	buildTagAnalysis,
	type ChartTagTreeNode,
	type ChartTagVotes,
} from "./b30-analysis";
import { kvKey, PHI_CHART_TAG_API } from "./const";

type TreeBody = { data?: unknown };
type BatchBody = { data?: ChartTagVotes };

export const CHART_TAG_TIMEOUT_MS = 30_000;

const agent = new Agent({
	connections: 8,
	pipelining: 1,
	keepAliveTimeout: 10_000,
	keepAliveMaxTimeout: 30_000,
	connectTimeout: CHART_TAG_TIMEOUT_MS,
	headersTimeout: CHART_TAG_TIMEOUT_MS,
	bodyTimeout: CHART_TAG_TIMEOUT_MS,
});

const TREE_TTL_MS = 6 * 60 * 60 * 1000;
let treeCache: { at: number; value: Promise<ChartTagTreeNode[]> } | null = null;

export class ChartTagTimeoutError extends Error {
	constructor(message = "chart-tag timed out") {
		super(message);
		this.name = "ChartTagTimeoutError";
	}
}

export function isChartTagTimeout(err: unknown): boolean {
	let cur: unknown = err;
	for (let i = 0; i < 4 && cur; i++) {
		if (cur instanceof ChartTagTimeoutError) return true;
		if (!(cur instanceof Error)) return false;
		if (
			cur.name === "TimeoutError" ||
			cur.name === "AbortError" ||
			cur.name === "ConnectTimeoutError" ||
			cur.name === "HeadersTimeoutError" ||
			cur.name === "BodyTimeoutError"
		) {
			return true;
		}
		const code = (cur as { code?: string }).code;
		if (typeof code === "string" && /TIMEOUT/i.test(code)) return true;
		if (/timeout|timed out|aborted/i.test(cur.message)) return true;
		cur = cur.cause;
	}
	return false;
}

export function chartTagUrl(path: string) {
	return `${PHI_CHART_TAG_API}${path}`;
}

type ChartTagJsonFetch = (path: string, init?: RequestInit) => Promise<unknown>;

/** Next.js patched `fetch` aborts :8080 in 1–2ms and hides undici's 30s agent. */
async function jsonFetch(path: string, init: RequestInit = {}) {
	const method = (init.method ?? "GET").toUpperCase();
	const url = chartTagUrl(path);
	const started = performance.now();
	try {
		const res = await undiciFetch(url, {
			method: init.method,
			body: typeof init.body === "string" ? init.body : undefined,
			signal: init.signal ?? AbortSignal.timeout(CHART_TAG_TIMEOUT_MS),
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			dispatcher: agent,
		});
		const ms = `${Math.round(performance.now() - started)}ms`;
		if (!res.ok) {
			const detail = await res.text().catch(() => "");
			logger.warn(`chart-tag ${method} ${url} ${res.status} ${ms}`);
			throw new Error(
				`chart-tag ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
			);
		}
		logger.info(`chart-tag ${method} ${url} ${res.status} ${ms}`);
		return res.json();
	} catch (err) {
		if (!(err instanceof Error && err.message.startsWith("chart-tag "))) {
			const detail =
				err instanceof Error ? `${err.name} ${err.message}` : String(err);
			logger.warn(
				`chart-tag ${method} ${url} fail ${Math.round(performance.now() - started)}ms ${detail}`,
			);
		}
		if (isChartTagTimeout(err)) throw new ChartTagTimeoutError();
		throw err;
	}
}

function apiSongId(id: string) {
	return id.endsWith(".0") ? id : `${id}.0`;
}

export function chartTagCacheId(
	saveRevision: string,
	records: Array<{ id: string; rank: string }>,
): string {
	const seen = new Set<string>();
	const parts: string[] = [];
	for (const record of records) {
		const key = `${apiSongId(record.id)}\0${record.rank}`;
		if (seen.has(key)) continue;
		seen.add(key);
		parts.push(key);
	}
	parts.sort();
	return createHash("sha256")
		.update(saveRevision)
		.update("\n")
		.update(parts.join("\n"))
		.digest("hex")
		.slice(0, 24);
}

const voteMem = new Map<string, ChartTagVotes>();

export function resetChartTagVoteMemForTest() {
	voteMem.clear();
}

async function readVoteCache(
	id: string,
	db?: Pick<Kv, "get">,
): Promise<ChartTagVotes | undefined> {
	const hot = voteMem.get(id);
	if (hot) return hot;
	const raw = await db?.get(kvKey("chartTags", id));
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return;
		}
		voteMem.set(id, parsed as ChartTagVotes);
		return parsed as ChartTagVotes;
	} catch {
		return;
	}
}

async function writeVoteCache(
	id: string,
	votes: ChartTagVotes,
	db?: Pick<Kv, "set">,
) {
	voteMem.set(id, votes);
	try {
		await db?.set(kvKey("chartTags", id), JSON.stringify(votes));
	} catch (err) {
		logger.warn(
			`chart-tag votes cache write skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
}

function asTree(raw: unknown): ChartTagTreeNode[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		if (!item || typeof item !== "object") return [];
		const node = item as {
			name?: unknown;
			voteCount?: unknown;
			children?: unknown;
		};
		if (typeof node.name !== "string" || !node.name) return [];
		return [
			{
				name: node.name,
				voteCount:
					typeof node.voteCount === "number" ? node.voteCount : undefined,
				children: asTree(node.children),
			},
		];
	});
}

export async function loadChartTagTree(): Promise<ChartTagTreeNode[]> {
	const now = Date.now();
	if (treeCache && now - treeCache.at < TREE_TTL_MS) return treeCache.value;
	const value = jsonFetch("/chartsTag/get/tagTree")
		.then((raw) => {
			const body = raw as TreeBody;
			const tree = asTree(body?.data ?? body);
			if (!tree.length) throw new Error("empty chart-tag tree");
			return tree;
		})
		.catch((err) => {
			if (treeCache?.value === value) treeCache = null;
			throw err;
		});
	treeCache = { at: now, value };
	return value;
}

export async function loadChartTagVotes(
	records: Array<{ id: string; rank: string }>,
	opts: {
		fetchJson?: ChartTagJsonFetch;
		saveRevision?: string;
		db?: Pick<Kv, "get" | "set">;
	} = {},
): Promise<ChartTagVotes> {
	const fetchJson = opts.fetchJson ?? jsonFetch;
	const seen = new Set<string>();
	const unique: { id: string; rank: string; apiId: string }[] = [];
	for (const record of records) {
		const apiId = apiSongId(record.id);
		const key = `${apiId}\0${record.rank}`;
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push({ id: record.id, rank: record.rank, apiId });
	}
	if (!unique.length) return {};
	const cacheId = opts.saveRevision
		? chartTagCacheId(opts.saveRevision, unique)
		: undefined;
	if (cacheId) {
		const hit = await readVoteCache(cacheId, opts.db);
		if (hit) {
			logger.info(`chart-tag votes cache hit ${cacheId}`);
			return hit;
		}
	}
	const body = (await fetchJson("/chartsTag/get/chartsTags", {
		method: "POST",
		body: JSON.stringify({
			data: unique.map((row) => ({
				song_id: row.apiId,
				rank: [row.rank],
			})),
		}),
	})) as BatchBody;
	const votes = pickVotes(unique, body?.data);
	if (cacheId) await writeVoteCache(cacheId, votes, opts.db);
	return votes;
}

function pickVotes(
	rows: Array<{ id: string; rank: string; apiId: string }>,
	raw: ChartTagVotes | undefined,
): ChartTagVotes {
	const out: ChartTagVotes = {};
	if (!raw || typeof raw !== "object") return out;
	for (const row of rows) {
		const votes =
			raw[row.apiId]?.[row.rank] || raw[row.id]?.[row.rank] || undefined;
		if (!votes) continue;
		out[row.id] ||= {};
		out[row.id]![row.rank] = votes;
		if (row.apiId !== row.id) {
			out[row.apiId] ||= {};
			out[row.apiId]![row.rank] = votes;
		}
	}
	return out;
}

export async function tagAnalysisFor(
	records: B30Record[],
	opts: { saveRevision?: string; db?: Pick<Kv, "get" | "set"> } = {},
) {
	const [tree, votes] = await Promise.all([
		loadChartTagTree(),
		loadChartTagVotes(records, {
			saveRevision: opts.saveRevision,
			db: opts.db,
		}),
	]);
	return buildTagAnalysis(records, tree, votes);
}
