import {
	getNotes,
	setCardQuality,
	setShowRecordStats,
	setShowTagAnalysis,
} from "@/phi/lib/notes";
import { authed } from "@/server/authed";
import { getDataHost } from "@/server/data-host";
import { parsePaintQuality } from "@/server/render/paint-budget";

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
		});
	});
}

export async function POST(request: Request) {
	return authed(async (userId) => {
		let body: {
			showTagAnalysis?: unknown;
			showRecordStats?: unknown;
			cardQuality?: unknown;
		};
		try {
			body = (await request.json()) as typeof body;
		} catch {
			return Response.json({ error: "bad_request" }, { status: 400 });
		}
		const host = await getDataHost();
		const out: {
			ok: true;
			showTagAnalysis?: boolean;
			showRecordStats?: boolean;
			cardQuality?: "high" | "fast";
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
		if (!wrote) return Response.json({ error: "bad_request" }, { status: 400 });
		return Response.json(out);
	});
}
