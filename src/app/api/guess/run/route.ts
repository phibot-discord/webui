import { sessionUserId } from "@/auth";
import { dayKey, puzzleKind } from "@/lib/guess";
import { runStep } from "@/lib/guess-board";
import { answerFor, answerView, clueUrl } from "@/server/guess";
import { isRanked, peekRun, startRun } from "@/server/guess-board";
import { localizedRetryAfter } from "@/server/i18n-http";
import { clientIp, rateLimit, rateLimitBy } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function dailyUser(p: string) {
	if (puzzleKind(p) !== "daily") return undefined;
	const user = await sessionUserId();
	return user ? { user, day: p.slice(2) } : undefined;
}

async function body(
	p: string,
	run: Awaited<ReturnType<typeof peekRun>>,
	day: string,
	user: string,
) {
	if (!run) return { run: null, now: Date.now() };
	const answer =
		run.status === "playing"
			? undefined
			: await answerFor(p).then((a) => a && answerView(a));
	return {
		run,
		now: Date.now(),
		clue: clueUrl(p, runStep(run)),
		ranked: run.status === "won" ? await isRanked(day, user) : undefined,
		...(answer ? { answer } : {}),
	};
}

export async function GET(request: Request) {
	const p = new URL(request.url).searchParams.get("p") || "";
	const who = await dailyUser(p);
	const limited = rateLimitBy(
		who
			? `guess-run:user:${who.user}`
			: `guess-run:ip:${clientIp(request.headers)}`,
		30,
	);
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	if (!who) return Response.json({ run: null, now: Date.now() });
	const run = await peekRun(who.day, who.user);
	return Response.json(await body(p, run, who.day, who.user), {
		headers: { "Cache-Control": "private, no-store" },
	});
}

export async function POST(request: Request) {
	const limited = rateLimit({ ip: `guess:${clientIp(request.headers)}` });
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	const { p } = (await request.json().catch(() => ({}))) as { p?: unknown };
	const who = await dailyUser(typeof p === "string" ? p : "");
	if (!who || who.day !== dayKey()) {
		return Response.json({ run: null, now: Date.now() });
	}
	const run = await startRun(who.day, who.user);
	return Response.json(await body(p as string, run, who.day, who.user), {
		headers: { "Cache-Control": "private, no-store" },
	});
}
