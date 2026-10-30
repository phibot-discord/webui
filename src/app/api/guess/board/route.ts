import { auth } from "@/auth";
import { dayKey } from "@/lib/guess";
import { boardFor, setRanked } from "@/server/guess-board";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function dayOf(raw: unknown): string | undefined {
	const day = typeof raw === "string" ? raw : "";
	return DAY.test(day) && day <= dayKey() ? day : undefined;
}

export async function GET(request: Request) {
	const limited = rateLimit({ ip: `guess-board:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedError(429, "rate_limit");
	const params = new URL(request.url).searchParams;
	const day = dayOf(params.get("day"));
	if (!day) return Response.json({ error: "bad_request" }, { status: 400 });
	const session = await auth();
	const viewer = session?.user?.id ?? undefined;
	const board = await boardFor(
		day,
		viewer,
		Boolean(viewer) && params.get("fresh") === "1",
	);
	return Response.json(board, {
		headers: { "Cache-Control": "private, no-store" },
	});
}

export async function POST(request: Request) {
	const session = await auth();
	const user = session?.user?.id;
	if (!user) return localizedError(401, "unauthorized");
	const limited = rateLimit({ userId: user, ip: clientIp(request.headers) });
	if (!limited.ok) return localizedError(429, "rate_limit");
	const body = (await request.json().catch(() => ({}))) as {
		day?: unknown;
		on?: unknown;
	};
	const day = dayOf(body.day);
	if (!day || typeof body.on !== "boolean") {
		return Response.json({ error: "bad_request" }, { status: 400 });
	}
	const ranked = await setRanked(day, user, session.user?.name ?? "", body.on);
	return Response.json({ ranked });
}
