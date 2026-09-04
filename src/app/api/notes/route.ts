import { sessionUserId } from "@/auth";
import { getNotes, setShowTagAnalysis } from "@/phi/lib/notes";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const host = await getDataHost();
	const notes = await getNotes(host.db, userId);
	return Response.json({
		showTagAnalysis: notes.showTagAnalysis !== false,
		showB30Analysis: notes.showB30Analysis !== false,
		allowApiUsage: notes.allowApiUsage !== false,
	});
}

export async function POST(request: Request) {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	let showTagAnalysis: unknown;
	try {
		const body = (await request.json()) as { showTagAnalysis?: unknown };
		showTagAnalysis = body.showTagAnalysis;
	} catch {
		return Response.json({ error: "bad_request" }, { status: 400 });
	}
	if (typeof showTagAnalysis !== "boolean") {
		return Response.json({ error: "bad_request" }, { status: 400 });
	}
	const host = await getDataHost();
	await setShowTagAnalysis(host.db, userId, showTagAnalysis);
	return Response.json({ ok: true, showTagAnalysis });
}
