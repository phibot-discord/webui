import { DARE_PARAM } from "@/lib/dare";
import { displayPlayerId } from "@/lib/player-display";
import { songPath } from "@/lib/song-path";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import { authed } from "@/server/authed";
import { loadBound } from "@/server/bound";
import { dareToken } from "@/server/dare";
import { getDataHost } from "@/server/data-host";
import { privateJson } from "@/server/http";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { rateLimitBy } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimitBy(`dare:${userId}`, 20);
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");
		const body = (await request.json().catch(() => null)) as {
			id?: unknown;
			rank?: unknown;
		} | null;
		const id = typeof body?.id === "string" ? body.id : "";
		const rank = body?.rank;
		if (!id || id.length > 200 || !(LEVEL as readonly unknown[]).includes(rank))
			return codeError(400, "bad_request");
		const bound = await loadBound(await getDataHost(), userId, { memo: true });
		if ("error" in bound) return codeError(409, bound.error);
		const record = bound.save.getScore(id, rank as LevelKind);
		if (!record || !(record.score > 0)) return codeError(404, "no_score");
		const token = dareToken(id, {
			rank: rank as LevelKind,
			acc: record.acc,
			status: record.score >= 1_000_000 ? "ap" : record.fc ? "fc" : "none",
			name: displayPlayerId(bound.save.saveInfo.PlayerId),
		});
		return privateJson({
			path: `${songPath(id)}?${new URLSearchParams({ [DARE_PARAM]: token })}`,
		});
	});
}
