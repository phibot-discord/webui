import {
	CARD_PROGRESS_HEADER,
	CARD_PROGRESS_TYPE,
	readCardProgress,
} from "@/lib/card-progress";
import {
	CARD_STATS_HEADER,
	type CardStats,
	parseCardStats,
} from "@/lib/card-stats";
import type { CardPhase } from "@/phi/lib/external";

const CARD_FETCH_REUSE_MS = 2_500;
const CARD_FETCH_MAX = 8;
const CARD_FETCH_TIMEOUT_MS = 80_000;
/** Covers the server's 10 s per-process memo of the token and save, plus slack */
const CARD_FRESH_MS = 15_000;

type CardBlob = {
	url: string;
	stats?: CardStats;
};

type Slot = {
	promise: Promise<CardBlob>;
	at: number;
	value?: CardBlob;
	phase?: CardPhase;
	watchers: Set<(phase: CardPhase) => void>;
};

const slots = new Map<string, Slot>();
let freshUntil = 0;

/** `fresh` also skips the browser cache and the server memo briefly */
export function clearCardBlobs(opts: { fresh?: boolean } = {}) {
	for (const slot of slots.values()) {
		if (slot.value) forgetUrl(slot.value.url);
	}
	slots.clear();
	if (opts.fresh) freshUntil = Date.now() + CARD_FRESH_MS;
}

export function resetCardFetchCacheForTest() {
	clearCardBlobs();
	freshUntil = 0;
}

export function peekCardBlob(src: string): CardBlob | undefined {
	const slot = slots.get(src);
	if (!slot?.value) return undefined;
	if (Date.now() - slot.at > CARD_FETCH_REUSE_MS) return undefined;
	return slot.value;
}

export function loadCardBlob(
	src: string,
	onPhase?: (phase: CardPhase) => void,
): Promise<CardBlob> {
	const now = Date.now();
	const hit = slots.get(src);
	if (hit?.value && now - hit.at <= CARD_FETCH_REUSE_MS) {
		return Promise.resolve(hit.value);
	}
	if (hit?.promise) {
		if (onPhase) {
			hit.watchers.add(onPhase);
			if (hit.phase) onPhase(hit.phase);
		}
		return hit.promise;
	}
	const watchers = new Set(onPhase ? [onPhase] : []);
	// Called after the response starts, so `slot` is set by then
	const promise = fetchCard(src, (phase) => {
		slot.phase = phase;
		for (const watch of watchers) watch(phase);
	});
	const slot: Slot = { promise, at: now, watchers };
	slots.set(src, slot);
	trimSlots();
	promise.then(
		(value) => {
			if (slots.get(src) !== slot) {
				forgetUrl(value.url);
				return;
			}
			slot.value = value;
			slot.at = Date.now();
		},
		() => {
			if (slots.get(src) === slot) slots.delete(src);
		},
	);
	return promise;
}

async function cardFromResponse(res: Response, t0: number): Promise<CardBlob> {
	const parsed = parseCardStats(res.headers.get(CARD_STATS_HEADER));
	return cardFromBlob(await res.blob(), parsed, t0);
}

function cardFromBlob(
	blob: Blob,
	parsed: CardStats | undefined,
	t0: number,
): CardBlob {
	const waitMs = Math.round(performance.now() - t0);
	const stats = parsed
		? { ...parsed, waitMs }
		: { cache: "miss" as const, cacheMs: 0, totalMs: waitMs, waitMs };
	return { url: objectUrl(blob), stats };
}

function httpError(data: { error?: string; code?: string }, fallback: string) {
	const err = new Error(data.error || fallback) as Error & { code?: string };
	err.name = "http";
	err.code = data.code;
	return err;
}

async function fetchCard(
	src: string,
	onPhase?: (phase: CardPhase) => void,
): Promise<CardBlob> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), CARD_FETCH_TIMEOUT_MS);
	const t0 = performance.now();
	try {
		const privateCard = src.startsWith("/api/card/");
		const maxAttempts = privateCard ? 3 : 1;
		let last: { error?: string; code?: string; fallback: string } | undefined;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			if (attempt > 0) {
				await new Promise((r) => setTimeout(r, attempt === 1 ? 400 : 1000));
			}
			// A revisit is a 304 answered from the browser's copy; right after a save change, "reload" skips it
			const res = await fetch(src, {
				cache: Date.now() < freshUntil ? "reload" : "no-cache",
				signal: ctrl.signal,
				headers: privateCard ? { [CARD_PROGRESS_HEADER]: "1" } : undefined,
			});
			if (
				res.ok &&
				res.body &&
				res.headers.get("content-type")?.startsWith(CARD_PROGRESS_TYPE)
			) {
				const out = await readCardProgress(res.body, onPhase);
				if ("done" in out) {
					const blob = new Blob(out.image as BlobPart[], {
						type: out.done.mime,
					});
					return cardFromBlob(blob, out.done.stats, t0);
				}
				last = { ...out.error, fallback: out.error.error || "error" };
				if (out.error.code !== "not_bound" && out.error.code !== "no_save")
					break;
				continue;
			}
			if (res.ok) return cardFromResponse(res, t0);
			const data = (await res.json().catch(() => ({
				error: res.statusText,
			}))) as { error?: string; code?: string };
			last = { ...data, fallback: res.statusText };
			if (data.code !== "not_bound" && data.code !== "no_save") break;
		}
		throw httpError(last || {}, last?.fallback || "error");
	} catch (err) {
		if (err instanceof Error && err.name === "http") throw err;
		const abort =
			(err instanceof DOMException && err.name === "AbortError") ||
			(err instanceof Error &&
				(err.name === "AbortError" || err.name === "TimeoutError"));
		const fail = new Error(abort ? "abort" : "network");
		fail.name = abort ? "abort" : "network";
		throw fail;
	} finally {
		clearTimeout(timer);
	}
}

function objectUrl(blob: Blob) {
	if (typeof URL.createObjectURL === "function") {
		return URL.createObjectURL(blob);
	}
	return `blob:card:${Math.random().toString(36).slice(2)}`;
}

function forgetUrl(url: string) {
	if (!url.startsWith("blob:")) return;
	if (typeof URL.revokeObjectURL !== "function") return;
	try {
		URL.revokeObjectURL(url);
	} catch {
		/* node / fake blob urls */
	}
}

function trimSlots() {
	while (slots.size > CARD_FETCH_MAX) {
		const oldest = slots.keys().next().value;
		if (oldest === undefined) return;
		const slot = slots.get(oldest);
		slots.delete(oldest);
		if (slot?.value) forgetUrl(slot.value.url);
	}
}
