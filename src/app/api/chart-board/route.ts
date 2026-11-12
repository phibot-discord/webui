import { sessionUserId } from "@/auth";
import {
	apiSongId,
	isLbLevel,
	LeaderboardError,
	songBoard,
	within,
} from "@/phi/lib/leaderboard";
import { runInBackground } from "@/server/background";
import { chartCell } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { logger } from "@/server/logger";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { ensureSongInfo } from "@/server/song-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 6_000;
const CACHE = "private, max-age=300";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
	const userId = await sessionUserId();
	if (!userId) return codeError(401, "unauthorized");
	const limited = rateLimit({
		ip: `board:${clientIp(request.headers)}`,
		userId: `board:${userId}`,
	});
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const params = new URL(request.url).searchParams;
	const chart = apiSongId((params.get("chart") ?? "").trim().slice(0, 160));
	const level = (params.get("level") ?? "").toUpperCase();
	await ensureSongInfo();
	if (chart === ".0" || !isLbLevel(level) || !chartCell(chart, level)) {
		return codeError(400, "bad_request");
	}
	const host = await getDataHost();
	const work = songBoard(chart, level, { db: host.db });
	work.catch(() => undefined);
	try {
		const board = await within(work, BUDGET_MS);
		if (board === "late") {
			runInBackground(work, (err) =>
				logger.warn(
					`chart board background miss: ${err instanceof Error ? err.message : err}`,
				),
			);
			return Response.json(
				{ pending: true },
				{ status: 202, headers: { ...NO_STORE, "Retry-After": "10" } },
			);
		}
		return Response.json(
			{ n: board.n, ap: board.ap, fc: board.fc, q: board.q, at: board.at },
			{ headers: { "Cache-Control": CACHE } },
		);
	} catch (err) {
		logger.warn(`chart board: ${err instanceof Error ? err.message : err}`);
		const busy = err instanceof LeaderboardError && err.code === "busy";
		return codeError(503, busy ? "upstream_busy" : "upstream_unavailable", {
			headers: { "Retry-After": "30" },
		});
	}
}
