export const CARD_KINDS = ["b30", "x30", "fc30", "hisb30", "info"] as const;
export type CardKind = (typeof CARD_KINDS)[number];
export const PUBLIC_KINDS = ["b30", "hisb30", "info"] as const;
export type PublicKind = (typeof PUBLIC_KINDS)[number];

export function isCardKind(v: string): v is CardKind {
	return (CARD_KINDS as readonly string[]).includes(v);
}

export function isPublicKind(v: string): v is PublicKind {
	return (PUBLIC_KINDS as readonly string[]).includes(v);
}

export function clampCount(raw: string | null | undefined): number {
	const n = Number(raw);
	if (!Number.isFinite(n)) return 33;
	return Math.max(33, Math.min(99, Math.trunc(n)));
}
