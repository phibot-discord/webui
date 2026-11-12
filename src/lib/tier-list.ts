export const TIERS = ["S", "A", "B", "C", "D"] as const;
export type Tier = (typeof TIERS)[number];
export type Placed = Record<string, Tier>;

export const TITLE_MAX = 40;
export const TIER_COLORS: Record<Tier, string> = {
	S: "#f2555a",
	A: "#f59f3a",
	B: "#f2d44b",
	C: "#63c174",
	D: "#5b9bf0",
};

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const GROUP = 5;

const isTier = (v: string | undefined): v is Tier =>
	(TIERS as readonly (string | undefined)[]).includes(v);

export function keyCode(key: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) {
		h ^= key.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	const v = (h >>> 0) & 0xffffff;
	return [18, 12, 6, 0].map((shift) => ALPHABET[(v >>> shift) & 63]).join("");
}

export function encodeTiers(keys: readonly string[], placed: Placed): string {
	let out = "";
	for (const key of keys) {
		const tier = placed[key];
		if (tier) out += keyCode(key) + tier;
	}
	return out;
}

export function decodeTiers(keys: readonly string[], raw: string): Placed {
	const out: Placed = {};
	if (!raw) return out;
	const byCode = new Map<string, string[]>();
	for (const key of keys) {
		const code = keyCode(key);
		const list = byCode.get(code) ?? [];
		list.push(key);
		byCode.set(code, list);
	}
	for (let i = 0; i + GROUP <= raw.length; i += GROUP) {
		const tier = raw[i + GROUP - 1];
		if (!isTier(tier)) continue;
		for (const key of byCode.get(raw.slice(i, i + GROUP - 1)) ?? [])
			out[key] = tier;
	}
	return out;
}

export function autoTiers(
	items: readonly { key: string; acc: number | null }[],
): Placed {
	const played = items
		.filter((i): i is { key: string; acc: number } => i.acc !== null)
		.sort(
			(a, b) => b.acc - a.acc || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
		);
	const out: Placed = {};
	played.forEach((item, i) => {
		const tier =
			TIERS[
				Math.min(
					TIERS.length - 1,
					Math.floor((i * TIERS.length) / played.length),
				)
			];
		if (tier) out[item.key] = tier;
	});
	return out;
}

export function cleanTitle(raw: string | undefined): string {
	return [...(raw ?? "").replace(/\s+/g, " ").trim()]
		.slice(0, TITLE_MAX)
		.join("");
}

export const IMAGE = {
	width: 1600,
	pad: 32,
	label: 120,
	tileW: 160,
	tileH: 85,
	gap: 8,
	head: 96,
	foot: 56,
} as const;

export type ImageLayout = {
	height: number;
	perLine: number;
	rows: { y: number; height: number }[];
};

export function imageLayout(counts: readonly number[]): ImageLayout {
	const perLine = Math.floor(
		(IMAGE.width - IMAGE.pad * 2 - IMAGE.label + IMAGE.gap) /
			(IMAGE.tileW + IMAGE.gap),
	);
	let y = IMAGE.head;
	const rows = counts.map((n) => {
		const lines = Math.max(1, Math.ceil(n / perLine));
		const height = lines * IMAGE.tileH + (lines + 1) * IMAGE.gap;
		const row = { y, height };
		y += height + IMAGE.gap;
		return row;
	});
	return { height: y + IMAGE.foot, perLine, rows };
}

export function tileSpot(
	layout: ImageLayout,
	row: number,
	index: number,
): { x: number; y: number } {
	const top = layout.rows[row]?.y ?? 0;
	const line = Math.floor(index / layout.perLine);
	const col = index % layout.perLine;
	return {
		x: IMAGE.pad + IMAGE.label + col * (IMAGE.tileW + IMAGE.gap),
		y: top + IMAGE.gap + line * (IMAGE.tileH + IMAGE.gap),
	};
}
