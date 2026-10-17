// Order is the tab order in CardNav, DeskSkeleton and Lookups
export const CARD_KINDS = [
	"b30",
	"hisb30",
	"info",
	"x30",
	"fc30",
	"song",
] as const;
export type CardKind = (typeof CARD_KINDS)[number];

/** The Cards page's other tabs, after the card kinds: pages of their own that work from the same bound save */
export const CARD_PAGES = [
	{ id: "tags", href: "/tags" },
	{ id: "simulate", href: "/simulate" },
] as const;
const PUBLIC_KINDS = ["b30", "hisb30", "info"] as const;
export type PublicKind = (typeof PUBLIC_KINDS)[number];

export function isCardKind(v: string): v is CardKind {
	return (CARD_KINDS as readonly string[]).includes(v);
}

export function isPublicKind(v: string): v is PublicKind {
	return (PUBLIC_KINDS as readonly string[]).includes(v);
}

export function cardCacheKind(kind: CardKind): string {
	return kind === "hisb30" ? "update" : kind;
}

export const SONG_LEVELS = ["EZ", "HD", "IN", "AT"] as const;
export type SongLevel = (typeof SONG_LEVELS)[number];

export function parseSongLevel(raw: string | null | undefined): SongLevel {
	const v = String(raw || "").toUpperCase();
	return (SONG_LEVELS as readonly string[]).includes(v)
		? (v as SongLevel)
		: "AT";
}

export function clampCount(raw: string | null | undefined): number {
	const n = Number(raw);
	if (!Number.isFinite(n)) return 33;
	return Math.max(33, Math.min(99, Math.trunc(n)));
}
