import { LEVEL, type LevelKind } from "@/phi/lib/const";

export const PRACTICE_MAX = 30;
export const PRACTICE_GOALS = ["acc", "fc", "ap"] as const;
export type PracticeGoal = (typeof PRACTICE_GOALS)[number];

export type PracticeItem = {
	id: string;
	rank: LevelKind;
	goal: PracticeGoal;
	value?: number;
	from?: number;
	at: number;
};

export type PracticeRecord = { acc: number; score: number; fc: boolean };

const ACC_MIN = 70;
const ACC_MAX = 100;
const AP_SCORE = 1_000_000;
const ID_MAX = 200;

export const practiceKey = (id: string, rank: string) => `${id}:${rank}`;

const isRank = (v: unknown): v is LevelKind =>
	(LEVEL as readonly unknown[]).includes(v);
const isGoal = (v: unknown): v is PracticeGoal =>
	(PRACTICE_GOALS as readonly unknown[]).includes(v);

export function practiceItem(
	raw: unknown,
	at: number,
): PracticeItem | undefined {
	if (typeof raw !== "object" || raw === null) return undefined;
	const r = raw as Record<string, unknown>;
	if (typeof r.id !== "string" || !r.id || r.id.length > ID_MAX)
		return undefined;
	if (!isRank(r.rank) || !isGoal(r.goal)) return undefined;
	const item: PracticeItem = { id: r.id, rank: r.rank, goal: r.goal, at };
	if (r.goal === "acc") {
		const value = Number(r.value);
		if (!Number.isFinite(value) || value < ACC_MIN || value > ACC_MAX)
			return undefined;
		item.value = Math.round(value * 100) / 100;
	}
	if (
		typeof r.from === "number" &&
		Number.isFinite(r.from) &&
		r.from >= 0 &&
		r.from <= 100
	)
		item.from = r.from;
	return item;
}

export function parsePracticeList(
	raw: string | null | undefined,
): PracticeItem[] {
	if (!raw) return [];
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return [];
	}
	const items = (data as { items?: unknown } | null)?.items;
	if (!Array.isArray(items)) return [];
	const out: PracticeItem[] = [];
	const seen = new Set<string>();
	for (const entry of items) {
		const at = Number((entry as { at?: unknown } | null)?.at);
		const item = practiceItem(entry, Number.isFinite(at) ? at : 0);
		if (!item) continue;
		const key = practiceKey(item.id, item.rank);
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(item);
		if (out.length >= PRACTICE_MAX) break;
	}
	return out;
}

export function withPracticeItem(
	list: readonly PracticeItem[],
	item: PracticeItem,
): PracticeItem[] | "full" {
	const key = practiceKey(item.id, item.rank);
	const rest = list.filter((x) => practiceKey(x.id, x.rank) !== key);
	return rest.length >= PRACTICE_MAX ? "full" : [...rest, item];
}

export function withoutPracticeItem(
	list: readonly PracticeItem[],
	id: string,
	rank: string,
): PracticeItem[] {
	const key = practiceKey(id, rank);
	return list.filter((x) => practiceKey(x.id, x.rank) !== key);
}

export function practiceReached(
	item: PracticeItem,
	record: PracticeRecord | undefined,
): boolean {
	if (!record) return false;
	if (item.goal === "ap") return record.score >= AP_SCORE;
	if (item.goal === "fc") return record.fc || record.score >= AP_SCORE;
	return record.acc >= (item.value ?? ACC_MAX) - 1e-9;
}
