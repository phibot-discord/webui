import { sessionUser, sessionUserId } from "@/auth";
import { dayKey, gameOf, isGuessDay } from "@/lib/guess";
import { boardFor, setRanked } from "@/server/guess-board";
import {
	codeError,
	localizedError,
	localizedRetryAfter,
} from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayOf(raw: unknown): string | undefined {
	return typeof raw === "string" && isGuessDay(raw) ? raw : undefined;
}

export async function GET(request: Request) {
	const limited = rateLimit({ ip: `guess-board:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const params = new URL(request.url).searchParams;
	const day = dayOf(params.get("day"));
	if (!day) return codeError(400, "bad_request");
	const viewer = (await sessionUserId()) ?? undefined;
	const board = await boardFor(
		day,
		viewer,
		Boolean(viewer) && params.get("fresh") === "1",
		gameOf(params.get("game")),
	);
	return Response.json(board, {
		headers: { "Cache-Control": "private, no-store" },
	});
}

export async function POST(request: Request) {
	const player = await sessionUser();
	const user = player?.id;
	if (!user) return localizedError(401, "unauthorized");
	const limited = rateLimit({ userId: user, ip: clientIp(request.headers) });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const body = (await request.json().catch(() => ({}))) as {
		day?: unknown;
		on?: unknown;
		game?: unknown;
	};
	const day = dayOf(body.day);
	if (!day || day !== dayKey() || typeof body.on !== "boolean") {
		return codeError(400, "bad_request");
	}
	const ranked = await setRanked(
		day,
		user,
		player?.name ?? "",
		body.on,
		gameOf(body.game),
	);
	return Response.json({ ranked });
}
