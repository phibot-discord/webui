import { sessionUserId } from "@/auth";
import { localizedError } from "@/server/i18n-http";
import { createShare, getShareSlug, revokeShare } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const slug = await getShareSlug(userId);
	return Response.json({ slug: slug || null });
}

export async function POST() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	const slug = await createShare(userId);
	return Response.json({ slug });
}

export async function DELETE() {
	const userId = await sessionUserId();
	if (!userId) return localizedError(401, "unauthorized");
	await revokeShare(userId);
	return Response.json({ ok: true });
}
