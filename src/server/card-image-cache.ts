export type CardImageCacheInput = {
	kind: string;
	userId: string;
	saveRevision: string;
	locale: string;
	quality: string;
	epoch: string;
	count: string;
	theme: string;
	analysisFlag: string;
	tagFlag: string;
	renderVersion: string;
};

export function cardCacheParts(
	input: CardImageCacheInput,
	suffix: "jpeg" | "height",
): string[] {
	return [
		input.kind,
		input.userId,
		input.saveRevision,
		input.locale,
		input.quality,
		...(suffix === "jpeg" ? [input.epoch || "0"] : []),
		input.count,
		input.theme || "default",
		input.analysisFlag,
		input.tagFlag,
		input.renderVersion,
		suffix,
	];
}

export function parseCachedHeight(raw: unknown): number | undefined {
	const n = typeof raw === "number" ? raw : Number(raw);
	if (!Number.isFinite(n) || n <= 64) return;
	return Math.round(n);
}
