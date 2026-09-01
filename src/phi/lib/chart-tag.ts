import type { Kv } from "@/server/sdk";
import { kvKey } from "./const";

type TagVotes = { agree: string[]; disagree: string[] };
type TagData = Record<string, Record<string, Record<string, TagVotes>>>;

const KEY = kvKey("chartTag");

export class ChartTag {
	data: TagData = {};
	private db: Kv | undefined;

	async attach(db: Kv) {
		this.db = db;
		const raw = await db.get(KEY);
		if (!raw) {
			this.data = {};
			return this;
		}
		try {
			this.data = JSON.parse(raw) as TagData;
		} catch {
			this.data = {};
		}
		return this;
	}

	private persist() {
		if (!this.db) return false;
		void this.db.set(KEY, JSON.stringify(this.data));
		return true;
	}

	get(songId: string, rank: string, all = false) {
		const d = this.data?.[songId]?.[rank];
		if (!d) return [];
		const arr: { name: string; value: number }[] = [];
		for (const [key, obj] of Object.entries(d)) {
			const value = obj.agree.length - obj.disagree.length;
			if (!all && value <= 0) continue;
			arr.push({ name: key, value });
		}
		return arr;
	}

	add(id: string, tag: string, rank: string, agree: boolean, userId: string) {
		this.data[id] ||= {};
		this.data[id]![rank] ||= {};
		this.data[id]![rank]![tag] ||= { agree: [], disagree: [] };
		const row = this.data[id]![rank]![tag]!;
		if (agree) {
			if (!row.agree.includes(userId)) row.agree.push(userId);
			const i = row.disagree.indexOf(userId);
			if (i >= 0) row.disagree.splice(i, 1);
		} else {
			if (!row.disagree.includes(userId)) row.disagree.push(userId);
			const i = row.agree.indexOf(userId);
			if (i >= 0) row.agree.splice(i, 1);
		}
		return this.persist();
	}

	cancel(id: string, tag: string, rank: string, userId: string) {
		this.data[id] ||= {};
		this.data[id]![rank] ||= {};
		this.data[id]![rank]![tag] ||= { agree: [], disagree: [] };
		const row = this.data[id]![rank]![tag]!;
		const ai = row.agree.indexOf(userId);
		if (ai >= 0) row.agree.splice(ai, 1);
		const di = row.disagree.indexOf(userId);
		if (di >= 0) row.disagree.splice(di, 1);
		if (!row.agree.length && !row.disagree.length)
			delete this.data[id]![rank]![tag];
		return this.persist();
	}
}

export const chartTag = new ChartTag();
