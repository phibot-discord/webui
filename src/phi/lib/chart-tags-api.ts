import { runInBackground } from "@/server/background";
import { logger } from "@/server/logger";
import {
	errChain,
	isTimeoutError,
	outgoingAgent,
	outgoingFetch,
	socketTimeouts,
} from "@/server/outgoing";
import type { ChartTagTreeNode } from "./b30-analysis";
import { loadTagVotes, type TagVotes } from "./chart-tag-votes";
import {
	isProxyHost,
	PHI_CHART_TAG_API,
	PHI_PROXY_KEY,
	PROXY_KEY_HEADER,
} from "./const";

export const CHART_TAG_TIMEOUT_MS = 60_000;
/** The attempt keeps running this long after the render gives up, to fill the cache */
export const CHART_TAG_BACKGROUND_MS = 30_000;

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

class ChartTagTimeoutError extends Error {
	constructor(message = "chart-tag timed out") {
		super(message);
		this.name = "ChartTagTimeoutError";
	}
}

export function isChartTagTimeout(err: unknown): boolean {
	return err instanceof ChartTagTimeoutError || isTimeoutError(err);
}

export function chartTagUrl(path: string) {
	return `${PHI_CHART_TAG_API}${path}`;
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

export async function chartTagJsonFetchOnce(
	path: string,
	init: RequestInit = {},
) {
	const method = (init.method ?? "GET").toUpperCase();
	const url = chartTagUrl(path);
	const started = performance.now();
	try {
		const res = await outgoingFetch(url, {
			method,
			body:
				method === "GET" || method === "HEAD"
					? undefined
					: typeof init.body === "string"
						? init.body
						: undefined,
			signal: init.signal ?? AbortSignal.timeout(CHART_TAG_BACKGROUND_MS),
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
		// Awaited here so a body cut off mid-stream is classified too
		return await res.json();
	} catch (err) {
		if (err instanceof Error && err.message.startsWith("chart-tag ")) {
			throw err;
		}
		const elapsed = Math.round(performance.now() - started);
		logger.warn(
			`chart-tag ${method} ${url} fail ${elapsed}ms try 1 ${errChain(err)}`,
		);
		if (isChartTagTimeout(err)) throw new ChartTagTimeoutError();
		throw err instanceof Error ? err : new Error(errChain(err));
	}
}

/** `work` keeps running past the budget to fill the cache */
export async function withChartTagBudget<T>(
	work: Promise<T>,
	budgetMs: number,
	label: string,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const over = new Promise<"over">((resolve) => {
		timer = setTimeout(() => resolve("over"), budgetMs);
	});
	try {
		const first = await Promise.race([work.then((value) => ({ value })), over]);
		if (first !== "over") return first.value;
	} finally {
		clearTimeout(timer);
	}
	logger.warn(`chart-tag ${label} over ${budgetMs}ms; finishing in background`);
	runInBackground(work, (err) =>
		logger.warn(
			`chart-tag ${label} background miss: ${err instanceof Error ? err.message : err}`,
		),
	);
	throw new ChartTagTimeoutError(
		`chart-tag ${label} over ${budgetMs}ms budget`,
	);
}

export type ChartTagTreeDeps = {
	load?: () => Promise<TagVotes | undefined>;
};

export async function loadChartTagTree(
	deps: ChartTagTreeDeps = {},
): Promise<ChartTagTreeNode[]> {
	const votes = await (deps.load ?? loadTagVotes)();
	return votes?.tree ?? [];
}
