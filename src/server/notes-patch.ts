import { cardStyles, isStyledKind } from "@/phi/lib/card-styles";
import {
	isB30AvgKind,
	isRankBandShow,
	isRankScope,
	type NotesPatch,
} from "@/phi/lib/notes";

export type NotesReply = { ok: true } & { [K in keyof NotesPatch]?: unknown };

const BAD = { error: "bad_request" } as const;

export function parseNotesPatch(
	body: unknown,
	knownBackground: (id: string) => string | undefined,
): { patch: NotesPatch; reply: NotesReply } | { error: "bad_request" } {
	if (typeof body !== "object" || body === null) return BAD;
	const b = body as Record<string, unknown>;
	if (
		(b.b30AvgKind !== undefined && !isB30AvgKind(b.b30AvgKind)) ||
		(b.rankScope !== undefined && !isRankScope(b.rankScope)) ||
		(b.rankBandShow !== undefined && !isRankBandShow(b.rankBandShow))
	) {
		return BAD;
	}
	const patch: NotesPatch = {};
	if (typeof b.showTagAnalysis === "boolean") {
		patch.showTagAnalysis = b.showTagAnalysis;
	}
	if (typeof b.showRecordStats === "boolean") {
		patch.showRecordStats = b.showRecordStats;
	}
	if (typeof b.stddevExcludeP3 === "boolean") {
		patch.stddevExcludeP3 = b.stddevExcludeP3;
	}
	if (b.cardQuality === "high" || b.cardQuality === "fast") {
		patch.cardQuality = b.cardQuality;
	}
	if (typeof b.cardBackground === "string") {
		if (b.cardBackground === "") patch.cardBackground = "";
		else {
			const id = knownBackground(b.cardBackground);
			if (!id) return BAD;
			patch.cardBackground = id;
		}
	}
	if (b.cardStyle !== undefined) {
		const pick = b.cardStyle as { kind?: unknown; style?: unknown } | null;
		const kind = typeof pick?.kind === "string" ? pick.kind : "";
		const style = typeof pick?.style === "string" ? pick.style : "";
		const valid = cardStyles(kind);
		const match = valid?.find((s) => s === style);
		if (!isStyledKind(kind) || match === undefined) return BAD;
		patch.cardStyle = { kind, style: match };
	}
	if (isB30AvgKind(b.b30AvgKind)) patch.b30AvgKind = b.b30AvgKind;
	if (isRankScope(b.rankScope)) patch.rankScope = b.rankScope;
	if (isRankBandShow(b.rankBandShow)) patch.rankBandShow = b.rankBandShow;
	if (typeof b.peerWait === "boolean") patch.peerWait = b.peerWait;
	if (Object.keys(patch).length === 0) return BAD;
	return { patch, reply: { ok: true, ...patch } };
}
