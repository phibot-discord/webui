import { kvKey } from "@/phi/lib/const";
import type { UserNotes } from "@/phi/lib/notes";

export const RENDER_VERSION = "v39";

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
	avgFlag: string;
	renderVersion: string;
};

export function cardCacheInput(args: {
	kind: string;
	userId: string;
	saveRevision: string;
	locale: string;
	paintQuality: string;
	epoch: string;
	count: number;
	notes: Pick<
		UserNotes,
		"theme" | "showB30Analysis" | "allowApiUsage" | "b30AvgKind" | "b30AvgColor"
	>;
	tagOn: boolean;
}): CardImageCacheInput {
	const { notes } = args;
	return {
		kind: args.kind,
		userId: args.userId,
		saveRevision: args.saveRevision,
		locale: `locale:${args.locale}`,
		quality: args.paintQuality,
		epoch: args.epoch,
		count: String(args.count),
		theme: notes.theme,
		renderVersion: RENDER_VERSION,
		analysisFlag: notes.showB30Analysis === false ? "a0" : "a1",
		tagFlag: args.tagOn ? "t1" : "t0",
		avgFlag:
			notes.allowApiUsage === false
				? "avg:none"
				: `avg:${notes.b30AvgKind || "all"}:${notes.b30AvgColor || "blue"}`,
	};
}

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
		input.avgFlag,
		input.renderVersion,
		suffix,
	];
}

export function parseCachedHeight(raw: unknown): number | undefined {
	const n = typeof raw === "number" ? raw : Number(raw);
	if (!Number.isFinite(n) || n <= 64) return;
	return Math.round(n);
}

export function cardEpochKey(userId: string): string {
	return kvKey("webCardEpoch", userId);
}

export async function getCardEpoch(
	store: { get: (key: string) => Promise<unknown> },
	userId: string,
): Promise<string> {
	const raw = await store.get(cardEpochKey(userId));
	return raw == null ? "" : String(raw);
}
