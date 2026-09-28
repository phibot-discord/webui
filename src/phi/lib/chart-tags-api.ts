import { createHash } from "node:crypto";
import { runInBackground } from "@/server/background";
import { logger } from "@/server/logger";
import {
	outgoingAgent,
	outgoingFetch,
	socketTimeouts,
} from "@/server/outgoing";
import type { Kv } from "@/server/sdk";
import type { ChartTagTreeNode, TagAnalysis } from "./b30-analysis";
import {
	isProxyHost,
	kvKey,
	PHI_CHART_TAG_API,
	PHI_PROXY_KEY,
	PROXY_KEY_HEADER,
} from "./const";

type TreeBody = { data?: unknown };
type OriRecord = { score: number; acc: number; fc: boolean };

export const CHART_TAG_TIMEOUT_MS = 60_000;
const CHART_TAG_MAX_ATTEMPTS = 4;

export const chartTagAgent = {
	...socketTimeouts(CHART_TAG_TIMEOUT_MS),
	headersTimeout: CHART_TAG_TIMEOUT_MS,
	bodyTimeout: CHART_TAG_TIMEOUT_MS,
};

const agent = outgoingAgent({
	connections: 8,
	pipelining: 1,
	keepAliveTimeout: 10_000,
	keepAliveMaxTimeout: 30_000,
	...chartTagAgent,
});

const TREE_TTL_MS = 6 * 60 * 60 * 1000;
let treeCache: { at: number; value: Promise<ChartTagTreeNode[]> } | null = null;

export function chartTagTreeR2Key(
	prefix = process.env.CLOUDFLARE_R2_INFO_PREFIX ?? "info",
) {
	return `${prefix.replace(/\/+$/, "")}/tagTree.json`;
}

class ChartTagTimeoutError extends Error {
	constructor(message = "chart-tag timed out") {
		super(message);
		this.name = "ChartTagTimeoutError";
	}
}

function errCode(err: unknown): string | undefined {
	return err && typeof err === "object" && "code" in err
		? String((err as { code?: unknown }).code || "")
		: undefined;
}

function errChain(err: unknown): string {
	const bits: string[] = [];
	let cur: unknown = err;
	for (let i = 0; i < 5 && cur; i++) {
		if (cur instanceof Error) {
			const code = errCode(cur);
			bits.push(
				[cur.name, cur.message, code]
					.filter((p) => p && p !== "undefined")
					.join(" "),
			);
			cur = cur.cause;
			continue;
		}
		bits.push(String(cur));
		break;
	}
	return bits.join(" <- ") || String(err);
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
		const code = errCode(cur);
		if (code && /TIMEOUT/i.test(code)) return true;
		if (/timeout|timed out|aborted/i.test(cur.message)) return true;
		cur = cur.cause;
	}
	return false;
}

export function isRetryableChartTagNet(err: unknown): boolean {
	if (err instanceof ChartTagTimeoutError) return true;
	let cur: unknown = err;
	for (let i = 0; i < 4 && cur; i++) {
		if (!(cur instanceof Error)) return false;
		const code = errCode(cur) || "";
		if (
			/^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|EPIPE|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET)$/i.test(
				code,
			)
		) {
			return true;
		}
		if (cur.name === "TypeError" && /fetch failed/i.test(cur.message)) {
			return true;
		}
		if (isChartTagTimeout(cur)) return true;
		cur = cur.cause;
	}
	return false;
}

export function chartTagUrl(path: string) {
	return `${PHI_CHART_TAG_API}${path}`;
}

export function chartTagRemainMs(started: number, now = performance.now()) {
	return Math.max(1_000, Math.floor(CHART_TAG_TIMEOUT_MS - (now - started)));
}

export type ChartTagJsonFetch = (
	path: string,
	init?: RequestInit,
) => Promise<unknown>;

export function chartTagHeaders(
	url = PHI_CHART_TAG_API,
	proxyKey = PHI_PROXY_KEY,
): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: "application/json",
		"Content-Type": "application/json",
	};
	if (proxyKey && isProxyHost(url)) headers[PROXY_KEY_HEADER] = proxyKey;
	return headers;
}

async function jsonFetch(path: string, init: RequestInit = {}) {
	const method = (init.method ?? "GET").toUpperCase();
	const url = chartTagUrl(path);
	const started = performance.now();
	let last: unknown;
	for (let attempt = 1; attempt <= CHART_TAG_MAX_ATTEMPTS; attempt++) {
		const remain = chartTagRemainMs(started);
		try {
			const res = await outgoingFetch(url, {
				method,
				body:
					method === "GET" || method === "HEAD"
						? undefined
						: typeof init.body === "string"
							? init.body
							: undefined,
				signal: init.signal ?? AbortSignal.timeout(remain),
				headers: chartTagHeaders(url),
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
			last = err;
			if (err instanceof Error && err.message.startsWith("chart-tag ")) {
				throw err;
			}
			const elapsed = Math.round(performance.now() - started);
			const left = CHART_TAG_TIMEOUT_MS - elapsed;
			const retry =
				attempt < CHART_TAG_MAX_ATTEMPTS &&
				left > 2_000 &&
				isRetryableChartTagNet(err);
			logger.warn(
				`chart-tag ${method} ${url} fail ${elapsed}ms try ${attempt}${retry ? " retry" : ""} ${errChain(err)}`,
			);
			if (!retry) break;
		}
	}
	if (isChartTagTimeout(last)) throw new ChartTagTimeoutError();
	throw last instanceof Error ? last : new Error(errChain(last));
}

export async function chartTagJsonFetch(path: string, init: RequestInit = {}) {
	return jsonFetch(path, init);
}

function apiSongId(id: string) {
	return id.endsWith(".0") ? id : `${id}.0`;
}

export function chartTagCacheId(saveRevision: string): string {
	return createHash("sha256").update(saveRevision).digest("hex").slice(0, 24);
}

/** One entry per save revision; keep the hot set small (KV holds the rest). */
const analysisMem = new Map<string, TagAnalysis>();
const ANALYSIS_MEM_MAX = 64;

function rememberAnalysis(id: string, analysis: TagAnalysis) {
	analysisMem.delete(id);
	analysisMem.set(id, analysis);
	while (analysisMem.size > ANALYSIS_MEM_MAX) {
		const oldest = analysisMem.keys().next().value;
		if (oldest === undefined) break;
		analysisMem.delete(oldest);
	}
}

export function resetChartTagVoteMemForTest() {
	analysisMem.clear();
}

async function readAnalysisCache(
	id: string,
	db?: Pick<Kv, "get">,
): Promise<TagAnalysis | undefined> {
	const hot = analysisMem.get(id);
	if (hot) return hot;
	const raw = await db?.get(kvKey("b30Analysis", id));
	if (!raw) return;
	try {
		const parsed = parseB30TagAnalysis(JSON.parse(raw));
		if (!parsed) return;
		rememberAnalysis(id, parsed);
		return parsed;
	} catch {
		return;
	}
}

/** The render does not wait for the KV copy; the in-memory entry serves this request. */
function writeAnalysisCache(
	id: string,
	analysis: TagAnalysis,
	db?: Pick<Kv, "set">,
) {
	rememberAnalysis(id, analysis);
	if (!db) return;
	runInBackground(
		db.set(kvKey("b30Analysis", id), JSON.stringify(analysis)),
		(err) =>
			logger.warn(
				`chart-tag analysis cache write skipped: ${err instanceof Error ? err.message : err}`,
			),
	);
}

function asTree(raw: unknown): ChartTagTreeNode[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		if (!item || typeof item !== "object") return [];
		const node = item as {
			name?: unknown;
			description?: unknown;
			voteCount?: unknown;
			children?: unknown;
		};
		if (typeof node.name !== "string" || !node.name) return [];
		return [
			{
				name: node.name,
				description:
					typeof node.description === "string" && node.description
						? node.description
						: undefined,
				voteCount:
					typeof node.voteCount === "number" ? node.voteCount : undefined,
				children: asTree(node.children),
			},
		];
	});
}

export function parseChartTagTree(raw: unknown): ChartTagTreeNode[] {
	const body = raw as TreeBody | unknown[] | undefined;
	if (Array.isArray(body)) return asTree(body);
	if (body && typeof body === "object") return asTree((body as TreeBody).data);
	return [];
}

export function resetChartTagTreeMemForTest() {
	treeCache = null;
}

async function readR2TreeRaw(): Promise<unknown> {
	try {
		const { fetchR2Object } = await import("@/server/r2");
		const buf = await fetchR2Object(chartTagTreeR2Key());
		if (!buf?.byteLength) return;
		return JSON.parse(buf.toString("utf8")) as unknown;
	} catch {
		return;
	}
}

export async function loadChartTagTree(
	opts: {
		getCached?: () => Promise<unknown>;
		fetchJson?: ChartTagJsonFetch;
	} = {},
): Promise<ChartTagTreeNode[]> {
	const now = Date.now();
	if (treeCache && now - treeCache.at < TREE_TTL_MS) return treeCache.value;
	const getCached = opts.getCached ?? readR2TreeRaw;
	const fetchJson = opts.fetchJson ?? jsonFetch;
	const value = (async () => {
		let cached: ChartTagTreeNode[] = [];
		try {
			cached = parseChartTagTree(await getCached());
		} catch {
			cached = [];
		}
		if (cached.length) {
			logger.info("chart-tag tree r2");
			return cached;
		}
		const tree = parseChartTagTree(
			await fetchJson("/chartsTag/get/tagTree", { method: "GET" }),
		);
		if (!tree.length) throw new Error("empty chart-tag tree");
		return tree;
	})().catch((err) => {
		if (treeCache?.value === value) treeCache = null;
		throw err;
	});
	treeCache = { at: now, value };
	return value;
}

export function gameRecordPayload(
	gameRecord: Record<
		string,
		Array<
			{ score?: number; acc?: number; fc?: boolean | number } | null | undefined
		>
	>,
): Record<string, Array<OriRecord | null>> {
	const out: Record<string, Array<OriRecord | null>> = {};
	for (const [id, rows] of Object.entries(gameRecord)) {
		out[apiSongId(id)] = rows.map((row) =>
			row
				? {
						score: Number(row.score) || 0,
						acc: Number(row.acc) || 0,
						fc: Boolean(row.fc),
					}
				: null,
		);
	}
	return out;
}

function num(value: unknown, fallback = 0) {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function asAnchor(value: unknown): "start" | "middle" | "end" {
	return value === "start" || value === "end" ? value : "middle";
}

export function parseB30TagAnalysis(raw: unknown): TagAnalysis | undefined {
	const body =
		raw && typeof raw === "object" && raw !== null && "data" in raw
			? (raw as { data: unknown }).data
			: raw;
	if (!body || typeof body !== "object" || Array.isArray(body)) return;
	const b = body as Record<string, unknown>;
	if (!Array.isArray(b.categories) || !b.radar || typeof b.radar !== "object") {
		return;
	}
	const radarIn = b.radar as Record<string, unknown>;
	if (
		!Array.isArray(radarIn.grids) ||
		!Array.isArray(radarIn.axes) ||
		!Array.isArray(radarIn.categories)
	) {
		return;
	}
	const categories = b.categories.flatMap((row) => {
		if (!row || typeof row !== "object") return [];
		const r = row as Record<string, unknown>;
		if (typeof r.name !== "string" || !r.name) return [];
		return [
			{
				name: r.name,
				rks: num(r.rks),
				votes: num(r.votes),
				hasVotes: Boolean(r.hasVotes),
			},
		];
	});
	const tags = (rows: unknown): TagAnalysis["strong"] =>
		Array.isArray(rows)
			? rows.flatMap((row) => {
					if (!row || typeof row !== "object") return [];
					const r = row as Record<string, unknown>;
					if (typeof r.name !== "string" || !r.name) return [];
					return [
						{
							name: r.name,
							rks: num(r.rks),
							votes: num(r.votes),
							charts: num(r.charts, num(r.sampleCount, 1)),
						},
					];
				})
			: [];
	return {
		totalVotes: num(b.totalVotes),
		minimumVotes: num(b.minimumVotes, 20),
		averageRks: num(b.averageRks),
		categories,
		radar: {
			grids: radarIn.grids.filter((g): g is string => typeof g === "string"),
			axes: radarIn.axes.flatMap((axis) => {
				if (!axis || typeof axis !== "object") return [];
				const a = axis as { x?: unknown; y?: unknown };
				return [{ x: num(a.x), y: num(a.y) }];
			}),
			points: typeof radarIn.points === "string" ? radarIn.points : "",
			categories: radarIn.categories.flatMap((row) => {
				if (!row || typeof row !== "object") return [];
				const r = row as Record<string, unknown>;
				if (typeof r.name !== "string" || !r.name) return [];
				return [
					{
						name: r.name,
						rks: num(r.rks),
						votes: num(r.votes),
						hasVotes: Boolean(r.hasVotes),
						displayRks:
							typeof r.displayRks === "string"
								? r.displayRks
								: num(r.rks).toFixed(2),
						pointX: num(r.pointX),
						pointY: num(r.pointY),
						labelX: num(r.labelX),
						labelY: num(r.labelY),
						anchor: asAnchor(r.anchor),
					},
				];
			}),
		},
		strong: tags(b.strong),
		weak: tags(b.weak),
		insufficient: Boolean(b.insufficient),
	};
}

export async function tagAnalysisFor(
	save: {
		gameRecord?: Record<
			string,
			Array<
				| { score?: number; acc?: number; fc?: boolean | number }
				| null
				| undefined
			>
		>;
	},
	opts: {
		fetchJson?: ChartTagJsonFetch;
		saveRevision?: string;
		db?: Pick<Kv, "get" | "set">;
	} = {},
): Promise<TagAnalysis> {
	const fetchJson = opts.fetchJson ?? jsonFetch;
	const cacheId = opts.saveRevision
		? chartTagCacheId(opts.saveRevision)
		: undefined;
	if (cacheId) {
		const hit = await readAnalysisCache(cacheId, opts.db);
		if (hit) {
			logger.info(`chart-tag analysis cache hit ${cacheId}`);
			return hit;
		}
	}
	const gameRecord = gameRecordPayload(save.gameRecord || {});
	try {
		const parsed = parseB30TagAnalysis(
			await fetchJson("/chartsTag/get/b30Analysis", {
				method: "POST",
				body: JSON.stringify({ gameRecord }),
			}),
		);
		if (!parsed) throw new Error("empty chart-tag analysis");
		if (cacheId) writeAnalysisCache(cacheId, parsed, opts.db);
		logger.info(
			`chart-tag analysis votes ${parsed.totalVotes} insufficient ${parsed.insufficient}`,
		);
		return parsed;
	} catch (err) {
		logger.warn(
			`chart-tag analysis miss: ${err instanceof Error ? err.message : err}`,
		);
		throw err;
	}
}
