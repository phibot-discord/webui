export function evictOldest(map: Map<string, unknown>, max: number) {
	while (map.size > max) {
		const oldest = map.keys().next().value;
		if (oldest === undefined) break;
		map.delete(oldest);
	}
}

export class TtlLru<V> {
	private map = new Map<string, { until: number; value: V }>();
	constructor(private max: number) {}

	has(key: string) {
		const hit = this.map.get(key);
		if (!hit) return false;
		if (Date.now() < hit.until) return true;
		this.map.delete(key);
		return false;
	}

	get(key: string): V | undefined {
		return this.has(key) ? this.map.get(key)?.value : undefined;
	}

	/** The stored value even when expired; never deletes */
	peek(key: string): V | undefined {
		return this.map.get(key)?.value;
	}

	set(key: string, value: V, ttlMs: number) {
		this.map.delete(key);
		this.map.set(key, { until: Date.now() + ttlMs, value });
		evictOldest(this.map, this.max);
	}

	clear() {
		this.map.clear();
	}
}
