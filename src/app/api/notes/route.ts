import { cardStyles, isStyledKind } from "@/phi/lib/card-styles";
import { knownBackground } from "@/phi/lib/catalog";
import {
	type B30AvgKind,
	b30AvgKindOf,
	getNotes,
	isB30AvgKind,
	isRankBandShow,
	isRankScope,
	type RankBandShow,
	type RankScope,
	rankBandShowOf,
	rankScopeOf,
	setB30AvgKind,
	setCardBackground,
	setCardQuality,
	setCardStyle,
	setPeerWait,
	setRankBandShow,
	setRankScope,
	setShowRecordStats,
	setShowTagAnalysis,
} from "@/phi/lib/notes";
import { authed } from "@/server/authed";
import { getDataHost } from "@/server/data-host";
import { parsePaintQuality } from "@/server/render/paint-budget";
import { ensureSongInfo } from "@/server/song-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) => {
		const host = await getDataHost();
		const notes = await getNotes(host.db, userId);
		return Response.json({
			showTagAnalysis: notes.showTagAnalysis !== false,
			showB30Analysis: notes.showB30Analysis !== false,
			showRecordStats: notes.showRecordStats !== false,
			allowApiUsage: notes.allowApiUsage !== false,
			cardQuality: parsePaintQuality(notes.cardQuality),
			cardBackground: notes.cardBackground || "",
			cardStyle: notes.cardStyle ?? {},
			b30AvgKind: b30AvgKindOf(notes),
			rankScope: rankScopeOf(notes),
			rankBandShow: rankBandShowOf(notes),
			peerWait: notes.peerWait === true,
		});
	});
}

export async function POST(request: Request) {
	return authed(async (userId) => {
		let body: {
			showTagAnalysis?: unknown;
			showRecordStats?: unknown;
			cardQuality?: unknown;
			cardBackground?: unknown;
			cardStyle?: unknown;
			b30AvgKind?: unknown;
			rankScope?: unknown;
			rankBandShow?: unknown;
			peerWait?: unknown;
		};
		try {
			body = (await request.json()) as typeof body;
		} catch {
			return Response.json({ error: "bad_request" }, { status: 400 });
		}
		if (
			(body.b30AvgKind !== undefined && !isB30AvgKind(body.b30AvgKind)) ||
			(body.rankScope !== undefined && !isRankScope(body.rankScope)) ||
			(body.rankBandShow !== undefined && !isRankBandShow(body.rankBandShow))
		) {
			return Response.json({ error: "bad_request" }, { status: 400 });
		}
		const host = await getDataHost();
		const out: {
			ok: true;
			showTagAnalysis?: boolean;
			showRecordStats?: boolean;
			cardQuality?: "high" | "fast";
			cardBackground?: string;
			cardStyle?: { kind: string; style: string };
			b30AvgKind?: B30AvgKind;
			rankScope?: RankScope;
			rankBandShow?: RankBandShow;
			peerWait?: boolean;
		} = { ok: true };
		let wrote = false;
		if (typeof body.showTagAnalysis === "boolean") {
			await setShowTagAnalysis(host.db, userId, body.showTagAnalysis);
			out.showTagAnalysis = body.showTagAnalysis;
			wrote = true;
		}
		if (typeof body.showRecordStats === "boolean") {
			await setShowRecordStats(host.db, userId, body.showRecordStats);
			out.showRecordStats = body.showRecordStats;
			wrote = true;
		}
		if (body.cardQuality === "high" || body.cardQuality === "fast") {
			await setCardQuality(host.db, userId, body.cardQuality);
			out.cardQuality = body.cardQuality;
			wrote = true;
		}
		if (typeof body.cardBackground === "string") {
			await ensureSongInfo();
			const id =
				body.cardBackground === "" ? "" : knownBackground(body.cardBackground);
			if (body.cardBackground !== "" && !id) {
				return Response.json({ error: "bad_request" }, { status: 400 });
			}
			await setCardBackground(host.db, userId, id);
			out.cardBackground = id;
			wrote = true;
		}
		if (body.cardStyle !== undefined) {
			const pick = body.cardStyle as { kind?: unknown; style?: unknown } | null;
			const kind = typeof pick?.kind === "string" ? pick.kind : "";
			const style = typeof pick?.style === "string" ? pick.style : "";
			const valid = cardStyles(kind) as readonly string[] | undefined;
			if (!isStyledKind(kind) || !valid?.includes(style)) {
				return Response.json({ error: "bad_request" }, { status: 400 });
			}
			await setCardStyle(
				host.db,
				userId,
				kind,
				style as Parameters<typeof setCardStyle>[3],
			);
			out.cardStyle = { kind, style };
			wrote = true;
		}
		if (isB30AvgKind(body.b30AvgKind)) {
			await setB30AvgKind(host.db, userId, body.b30AvgKind);
			out.b30AvgKind = body.b30AvgKind;
			wrote = true;
		}
		if (isRankScope(body.rankScope)) {
			await setRankScope(host.db, userId, body.rankScope);
			out.rankScope = body.rankScope;
			wrote = true;
		}
		if (isRankBandShow(body.rankBandShow)) {
			await setRankBandShow(host.db, userId, body.rankBandShow);
			out.rankBandShow = body.rankBandShow;
			wrote = true;
		}
		if (typeof body.peerWait === "boolean") {
			await setPeerWait(host.db, userId, body.peerWait);
			out.peerWait = body.peerWait;
			wrote = true;
		}
		if (!wrote) return Response.json({ error: "bad_request" }, { status: 400 });
		return Response.json(out);
	});
}
