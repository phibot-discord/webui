import { createHash } from "node:crypto";
import { runInBackground } from "./background";
import { logger } from "./logger";
import { fetchR2Object, r2Ready } from "./r2";

const TTL_MS = 5 * 60 * 1000;
const RETRY_MS = 60 * 1000;

export type JsonLoader<T> = {
	load(): Promise<T>;
	reset(): void;
};

// serves the old value while one read refreshes it, and keeps the last good value when a read fails
export function jsonLoader<T>(
	key: string | (() => string),
	parse: (raw: unknown) => T | undefined,
	empty: T,
): JsonLoader<T> {
	let cached: { value: T; until: number } | undefined;
	let inflight: Promise<T> | undefined;
	let last: { hash: string; value: T } | undefined;

	async function read(at: string): Promise<T | undefined> {
		// manifests change in place whatever they are called: always the API's current copy
		const buf = await fetchR2Object(at, {
			cache: "no-store",
			negative: false,
			fresh: true,
		});
		if (!buf?.byteLength) return undefined;
		const hash = createHash("sha1").update(buf).digest("hex");
		// an unchanged body keeps its parsed value, so memos keyed on it stay warm
		if (last?.hash === hash) return last.value;
		try {
			const value = parse(JSON.parse(buf.toString("utf8")));
			if (value) last = { hash, value };
			return value;
		} catch (err) {
			logger.warn(
				`${at} unreadable: ${err instanceof Error ? err.message : err}`,
			);
			return undefined;
		}
	}

	function refresh(): Promise<T> {
		const at = typeof key === "string" ? key : key();
		inflight ??= read(at)
			.catch((err: unknown) => {
				logger.warn(
					`${at} skipped: ${err instanceof Error ? err.message : err}`,
				);
				return undefined;
			})
			.then((value) => {
				cached = value
					? { value, until: Date.now() + TTL_MS }
					: { value: cached?.value ?? empty, until: Date.now() + RETRY_MS };
				return cached.value;
			})
			.finally(() => {
				inflight = undefined;
			});
		return inflight;
	}

	return {
		load() {
			if (cached && Date.now() < cached.until) {
				return Promise.resolve(cached.value);
			}
			if (!r2Ready()) return Promise.resolve(cached?.value ?? empty);
			if (!cached) return refresh();
			if (!inflight) runInBackground(refresh());
			return Promise.resolve(cached.value);
		},
		reset() {
			cached = undefined;
			inflight = undefined;
			last = undefined;
		},
	};
}
