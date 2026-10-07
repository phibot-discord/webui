import { auth } from "@/auth";
import { authed } from "@/server/authed";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
import {
	clearManual,
	loadManual,
	type ManualInput,
	saveManual,
} from "@/server/manual";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
	return authed(async (userId) => {
		const host = await getDataHost();
		// The editor saves what it loads: always a KV read (no `memo`), never a copy
		// that may predate a save made on another instance
		const data = await loadManual(host.db, userId);
		return Response.json(data ?? null, {
			headers: { "Cache-Control": "private, no-store" },
		});
	});
}

export async function PUT(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");
		let body: ManualInput;
		try {
			body = (await request.json()) as ManualInput;
		} catch {
			return Response.json({ error: "bad_request" }, { status: 400 });
		}
		const session = await auth();
		const result = await saveManual(
			userId,
			body,
			session?.user?.name?.trim() || "Player",
		);
		if ("error" in result) {
			return Response.json(
				{ error: result.error, detail: result.detail },
				{ status: result.status },
			);
		}
		return Response.json(result);
	});
}

export async function DELETE(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok) return localizedError(429, "rate_limit");
		const had = await clearManual(userId);
		return Response.json({ ok: true, had });
	});
}
