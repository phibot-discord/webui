import { type CollectionIndex, fileItems, OTHER_CHAPTER } from "./collection";
import type { GameKeyBlock, KeyType } from "./game-key";

export const UNLOCKS_VERSION = 1;

export type UnlockCounts = [unlocked: number, read: number];

export type UnlockLists = {
	collection: Record<string, UnlockCounts>;
	avatar: string[];
	single: string[];
	illustration: string[];
};

export type UnlocksError = "missing" | "version" | "format";

export type SaveUnlocks =
	| { v: typeof UNLOCKS_VERSION; error: UnlocksError }
	| ({ v: typeof UNLOCKS_VERSION } & UnlockLists);

const ERRORS: readonly UnlocksError[] = ["missing", "version", "format"];

function flagOf(
	types: readonly KeyType[],
	flags: readonly number[],
	type: KeyType,
): number | undefined {
	const at = types.indexOf(type);
	return at < 0 ? undefined : (flags[at] ?? 0);
}

export function compactUnlocks(block: GameKeyBlock): SaveUnlocks {
	const collection = new Map<string, UnlockCounts>();
	const avatar = new Set<string>();
	const single = new Set<string>();
	const illustration = new Set<string>();
	for (const { name, types, flags } of block.entries) {
		const unlocked = flagOf(types, flags, "collection");
		if (unlocked !== undefined)
			collection.set(name, [unlocked, flagOf(types, flags, "read") ?? 0]);
		if (types.includes("avatar")) avatar.add(name);
		if (types.includes("single")) single.add(name.trim());
		if (types.includes("illustration")) illustration.add(name.trim());
	}
	return {
		v: UNLOCKS_VERSION,
		collection: Object.fromEntries(collection),
		avatar: [...avatar],
		single: [...single],
		illustration: [...illustration],
	};
}

function isCount(n: unknown): n is number {
	return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 255;
}

function countsOf(raw: unknown): Record<string, UnlockCounts> | undefined {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
	const out = new Map<string, UnlockCounts>();
	for (const [key, value] of Object.entries(raw)) {
		if (!Array.isArray(value) || value.length !== 2) return undefined;
		const [unlocked, read] = value;
		if (!isCount(unlocked) || !isCount(read)) return undefined;
		out.set(key, [unlocked, read]);
	}
	return Object.fromEntries(out);
}

function namesOf(raw: unknown): string[] | undefined {
	return Array.isArray(raw) && raw.every((s) => typeof s === "string")
		? raw
		: undefined;
}

export function parseUnlocks(raw: unknown): SaveUnlocks | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const o = raw as Record<string, unknown>;
	if (o.v !== UNLOCKS_VERSION) return undefined;
	if (o.error !== undefined) {
		const error = ERRORS.find((e) => e === o.error);
		return error ? { v: UNLOCKS_VERSION, error } : undefined;
	}
	const collection = countsOf(o.collection);
	const avatar = namesOf(o.avatar);
	const single = namesOf(o.single);
	const illustration = namesOf(o.illustration);
	if (!collection || !avatar || !single || !illustration) return undefined;
	return { v: UNLOCKS_VERSION, collection, avatar, single, illustration };
}

export type UnlockState = "none" | "some" | "all";

export type ItemUnlock = {
	entries: number;
	unlocked: number;
	read: number;
	unread: number;
	state: UnlockState;
};

export function itemUnlock(
	collection: Readonly<Record<string, UnlockCounts>>,
	key: string,
	entries: number,
): ItemUnlock {
	const counts = Object.hasOwn(collection, key) ? collection[key] : undefined;
	const unlocked = Math.max(0, Math.min(counts?.[0] ?? 0, entries));
	const read = Math.min(counts?.[1] ?? 0, unlocked);
	return {
		entries,
		unlocked,
		read,
		unread: unlocked - read,
		state: unlocked === 0 ? "none" : unlocked < entries ? "some" : "all",
	};
}

export type UnlockItem = { key: string; entries: number };

export type UnlockTally = {
	items: number;
	unlocked: number;
	full: number;
	unread: number;
};

export function tallyUnlocks(
	collection: Readonly<Record<string, UnlockCounts>>,
	items: readonly UnlockItem[],
): UnlockTally {
	const tally: UnlockTally = { items: 0, unlocked: 0, full: 0, unread: 0 };
	for (const item of items) {
		const own = itemUnlock(collection, item.key, item.entries);
		tally.items += 1;
		if (own.state !== "none") tally.unlocked += 1;
		if (own.state === "all") tally.full += 1;
		tally.unread += own.unread;
	}
	return tally;
}

export type UnlocksShown = {
	state: "ok";
	collection: Record<string, UnlockCounts>;
	avatars: string[];
	chapters: Record<string, UnlockTally>;
	total: UnlockTally;
};

export type UnlocksMissing = "none" | "manual" | "refresh" | "unreadable";

export type UnlocksReply = { state: UnlocksMissing } | UnlocksShown;

const MISSING: readonly UnlocksMissing[] = [
	"none",
	"manual",
	"refresh",
	"unreadable",
];

export function unlocksReply(
	unlocks: UnlockLists,
	index: CollectionIndex,
): UnlocksShown {
	const known = new Map(
		index.items.map((item) => [item.key, item.entries.length]),
	);
	const capped = new Map<string, UnlockCounts>();
	for (const [key, [unlocked, read]] of Object.entries(unlocks.collection)) {
		const most = known.get(key);
		const own = most === undefined ? unlocked : Math.min(unlocked, most);
		capped.set(key, [own, Math.min(read, own)]);
	}
	const collection = Object.fromEntries(capped);
	const tally = (items: readonly { key: string; entries: unknown[] }[]) =>
		tallyUnlocks(
			collection,
			items.map((item) => ({ key: item.key, entries: item.entries.length })),
		);
	const { chapters, unfiled } = fileItems(index);
	const groups = new Map(
		chapters.map(({ chapter, items }) => [chapter.id, tally(items)]),
	);
	if (unfiled.length) groups.set(OTHER_CHAPTER, tally(unfiled));
	return {
		state: "ok",
		collection,
		avatars: unlocks.avatar,
		chapters: Object.fromEntries(groups),
		total: tally(index.items),
	};
}

function tallyOf(raw: unknown): UnlockTally | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const o = raw as Record<string, unknown>;
	const { items, unlocked, full, unread } = o;
	return [items, unlocked, full, unread].every(
		(n) => typeof n === "number" && Number.isInteger(n) && n >= 0,
	)
		? {
				items: items as number,
				unlocked: unlocked as number,
				full: full as number,
				unread: unread as number,
			}
		: undefined;
}

export function parseUnlocksReply(raw: unknown): UnlocksReply | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const o = raw as Record<string, unknown>;
	const missing = MISSING.find((state) => state === o.state);
	if (missing) return { state: missing };
	if (o.state !== "ok") return undefined;
	const collection = countsOf(o.collection);
	const avatars = namesOf(o.avatars);
	const total = tallyOf(o.total);
	if (!collection || !avatars || !total) return undefined;
	if (!o.chapters || typeof o.chapters !== "object") return undefined;
	const chapters = new Map<string, UnlockTally>();
	for (const [id, value] of Object.entries(o.chapters)) {
		const own = tallyOf(value);
		if (!own) return undefined;
		chapters.set(id, own);
	}
	return {
		state: "ok",
		collection,
		avatars,
		chapters: Object.fromEntries(chapters),
		total,
	};
}
