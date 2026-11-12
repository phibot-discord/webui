import { evictToBudget } from "@/phi/lib/lru";
import { readFile, stat } from "../vfs";

const MAX_BYTES = 64 * 1024 * 1024;

const cache = new Map<string, { stamp: string; data: Buffer }>();
let totalBytes = 0;

export function readAssetCached(path: string): Buffer {
	const s = stat(path);
	const stamp = `${s.mtimeMs}|${s.size}`;
	const hit = cache.get(path);
	if (hit && hit.stamp === stamp) {
		cache.delete(path);
		cache.set(path, hit);
		return hit.data;
	}
	const data = readFile(path);
	if (hit) totalBytes -= hit.data.byteLength;
	cache.delete(path);
	cache.set(path, { stamp, data });
	totalBytes += data.byteLength;
	totalBytes = evictToBudget(
		cache,
		totalBytes,
		MAX_BYTES,
		(entry) => entry.data.byteLength,
	);
	return data;
}
