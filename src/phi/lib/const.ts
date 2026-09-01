export const ALL_LEVEL = ["EZ", "HD", "IN", "AT", "LEGACY"] as const;
export const LEVEL = ["EZ", "HD", "IN", "AT"] as const;
export type LevelKind = (typeof LEVEL)[number];
export type AllLevelKind = (typeof ALL_LEVEL)[number];

export const LEVEL_NUM: Record<string, number> = {
	EZ: 0,
	HD: 1,
	IN: 2,
	AT: 3,
	LEGACY: 4,
};

export const PHI_KV = "phi";

export function kvKey(...parts: Array<string | number>) {
	return `${PHI_KV}:${parts.map(String).join(":")}`;
}

export const MAX_DIFFICULTY = 17.6;
