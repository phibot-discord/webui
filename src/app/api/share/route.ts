import { authed } from "@/server/authed";
import { createShare, getShareSlug, revokeShare } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) => {
		const slug = await getShareSlug(userId);
		return Response.json({ slug: slug || null });
	});
}

export async function POST() {
	return authed(async (userId) => {
		const slug = await createShare(userId);
		return Response.json({ slug });
	});
}

export async function DELETE() {
	return authed(async (userId) => {
		await revokeShare(userId);
		return Response.json({ ok: true });
	});
}
