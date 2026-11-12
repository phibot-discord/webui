import { knownBackground } from "@/phi/lib/catalog";
import {
	b30AvgKindOf,
	getNotes,
	patchNotes,
	rankBandShowOf,
	rankScopeOf,
} from "@/phi/lib/notes";
import { authed } from "@/server/authed";
import { getDataHost } from "@/server/data-host";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { parseNotesPatch } from "@/server/notes-patch";
import { rateLimitBy } from "@/server/rate-limit";
import { parsePaintQuality } from "@/server/render/paint-budget";
import { ensureSongInfo } from "@/server/song-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) => {
		const host = await getDataHost();
		const notes = await getNotes(host.db, userId);
		return Response.json(
			{
				showTagAnalysis: notes.showTagAnalysis !== false,
				showB30Analysis: notes.showB30Analysis !== false,
				showRecordStats: notes.showRecordStats !== false,
				stddevExcludeP3: notes.stddevExcludeP3 === true,
				allowApiUsage: notes.allowApiUsage !== false,
				cardQuality: parsePaintQuality(notes.cardQuality),
				cardBackground: notes.cardBackground || "",
				cardStyle: notes.cardStyle ?? {},
				b30AvgKind: b30AvgKindOf(notes),
				rankScope: rankScopeOf(notes),
				rankBandShow: rankBandShowOf(notes),
				peerWait: notes.peerWait === true,
			},
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	});
}

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimitBy(`notes:${userId}`, 30);
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return codeError(400, "bad_request");
		}
		if (
			typeof body === "object" &&
			body !== null &&
			typeof (body as { cardBackground?: unknown }).cardBackground === "string"
		) {
			await ensureSongInfo();
		}
		const parsed = parseNotesPatch(body, knownBackground);
		if ("error" in parsed) {
			return codeError(400, "bad_request");
		}
		await patchNotes((await getDataHost()).db, userId, parsed.patch);
		return Response.json(parsed.reply, {
			headers: { "Cache-Control": "private, no-store" },
		});
	});
}
