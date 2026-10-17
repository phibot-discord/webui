import {
	C9S6_MANIFEST_KEY,
	type HiddenSong,
	parseHiddenSong,
} from "@/lib/c9s6";
import { publicFiles } from "./assets";
import { runInBackground } from "./background";
import { cfFetch } from "./cf-fetch";
import { logger } from "./logger";
import { jsonLoader } from "./manifest";
import { publicObjectUrl, r2WriteReady } from "./r2";
import { withTimeout } from "./render-lock";

const manifest = jsonLoader<HiddenSong | null>(
	C9S6_MANIFEST_KEY,
	parseHiddenSong,
	null,
);

export function loadHiddenSong() {
	return manifest.load();
}

const SIZE_TTL_MS = 5 * 60 * 1000;
const SIZE_RETRY_MS = 60 * 1000;
const HEAD_TIMEOUT_MS = 3000;
const FIRST_WAIT_MS = 3000;

const sizes = new Map<string, { size: number | undefined; until: number }>();
const probing = new Map<string, Promise<void>>();

async function headSize(key: string): Promise<number | undefined> {
	const url = publicObjectUrl(key);
	if (!url) return undefined;
	const res = await cfFetch(url, {
		method: "HEAD",
		headers: { "Accept-Encoding": "identity" },
		timeoutMs: HEAD_TIMEOUT_MS,
	});
	if (!res.ok) return undefined;
	const encoding = (res.headers.get("content-encoding") || "identity")
		.trim()
		.toLowerCase();
	const length = Number(res.headers.get("content-length"));
	return encoding === "identity" && Number.isSafeInteger(length) && length > 0
		? length
		: undefined;
}

function probe(key: string): Promise<void> {
	let run = probing.get(key);
	if (!run) {
		run = headSize(key)
			.catch((err: unknown) => {
				logger.warn(
					`${key} size unknown: ${err instanceof Error ? err.message : err}`,
				);
				return undefined;
			})
			.then((size) => {
				sizes.set(key, {
					size,
					until: Date.now() + (size ? SIZE_TTL_MS : SIZE_RETRY_MS),
				});
			})
			.finally(() => probing.delete(key));
		probing.set(key, run);
	}
	return run;
}

// from the bucket listing with the API; else HEAD requests: a first visit waits a little, later ones use cached sizes
export async function objectSizes(
	keys: readonly string[],
	waitMs = FIRST_WAIT_MS,
): Promise<ReadonlyMap<string, number>> {
	if (r2WriteReady()) {
		const files = await withTimeout(
			publicFiles(),
			waitMs,
			"c9s6 listing",
		).catch(() => undefined);
		const out = new Map<string, number>();
		for (const key of keys) {
			const size = files?.get(key)?.size;
			if (size) out.set(key, size);
		}
		return out;
	}
	const now = Date.now();
	const stale = keys.filter((key) => (sizes.get(key)?.until ?? 0) <= now);
	if (stale.length) {
		const runs = Promise.all(stale.map(probe));
		if (stale.some((key) => !sizes.has(key))) {
			await withTimeout(runs, waitMs, "c9s6 sizes").catch(() => undefined);
		} else {
			runInBackground(runs);
		}
	}
	const out = new Map<string, number>();
	for (const key of keys) {
		const size = sizes.get(key)?.size;
		if (size) out.set(key, size);
	}
	return out;
}

export function resetHiddenSongForTest() {
	manifest.reset();
	sizes.clear();
	probing.clear();
}
