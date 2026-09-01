import type { KvStore } from "@/server/kv";
import { PHI_KV } from "./const";

const KEY = `${PHI_KV}:rksRankSet`;

export class RksRank {
	constructor(private kv: KvStore) {}

	addUserRks(sessionToken: string, rks: number) {
		return this.kv.sortedAdd(KEY, { score: rks * -1, value: sessionToken });
	}

	delUserRks(sessionToken: string) {
		return this.kv.sortedRemove(KEY, sessionToken);
	}

	getUserRank(sessionToken: string) {
		return this.kv.sortedRank(KEY, sessionToken);
	}

	getUserRks(sessionToken: string) {
		return this.kv.sortedScore(KEY, sessionToken);
	}

	getRankUser(min: number, max: number) {
		return this.kv.sortedRange(KEY, min, max - 1);
	}

	getRankByRks(rks: number) {
		return this.kv.sortedCount(KEY, rks * -1, 100);
	}

	getAllRank() {
		return this.kv.sortedSize(KEY);
	}
}

export let getRksRank: RksRank;

export function initRksRank(kv: KvStore) {
	getRksRank = new RksRank(kv);
	return getRksRank;
}
