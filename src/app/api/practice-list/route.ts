import { practiceItem } from "@/lib/practice-list";
import { authed } from "@/server/authed";
import { chartCell } from "@/server/charts";
import { privateJson } from "@/server/http";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { dropPracticeItem, keepPracticeItem } from "@/server/practice-list";
import { rateLimitBy } from "@/server/rate-limit";
import { ensureSongInfo } from "@/server/song-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimitBy(`practice-list:${userId}`, 30);
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");
		const body = (await request.json().catch(() => null)) as Record<
			string,
			unknown
		> | null;
		if (typeof body !== "object" || body === null)
			return codeError(400, "bad_request");
		if (body.op === "remove") {
			if (typeof body.id !== "string" || typeof body.rank !== "string")
				return codeError(400, "bad_request");
			await dropPracticeItem(userId, body.id, body.rank);
			return privateJson({ ok: true });
		}
		if (body.op !== "add") return codeError(400, "bad_request");
		const item = practiceItem(body, Date.now());
		if (!item) return codeError(400, "bad_request");
		await ensureSongInfo();
		const cell = chartCell(item.id, item.rank);
		if (!cell || !(cell[0] > 0)) return codeError(400, "bad_request");
		const kept = await keepPracticeItem(userId, item);
		if (kept === "full") return codeError(409, "practice_full");
		return privateJson({ ok: true });
	});
}
