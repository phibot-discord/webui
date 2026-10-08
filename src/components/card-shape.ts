import type { CardStyle } from "@/phi/lib/card-styles";

export type CardSize = [width: number, height: number];

/** The placeholder's shape before a card has been seen (CardViewer, DeskSkeleton) */
export function defaultCardSize(kind: string, style: CardStyle): CardSize {
	if (kind === "info") return [3840, 2864];
	if (kind === "song") return [1600, 2824];
	if (kind === "hisb30")
		return style === "classic" ? [1600, 986] : [1600, 2000];
	if (style === "table") return [2400, 6608];
	if (style === "portrait") return [1280, 11862];
	return [2400, 4418];
}
