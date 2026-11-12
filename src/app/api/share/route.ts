import { authed } from "@/server/authed";
import { privateJson } from "@/server/http";
import { localizedRetryAfter } from "@/server/i18n-http";
import { rateLimitBy } from "@/server/rate-limit";
import { createShare, getShareSlug, revokeShare } from "@/server/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	return authed(async (userId) => {
		const slug = await getShareSlug(userId);
		return privateJson({ slug: slug || null });
	});
}

export async function POST() {
	return authed(async (userId) => {
		const limited = rateLimitBy(`share:${userId}`, 20);
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");
		const slug = await createShare(userId);
		return privateJson({ slug });
	});
}

export async function DELETE() {
	return authed(async (userId) => {
		const limited = rateLimitBy(`share:${userId}`, 20);
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");
		await revokeShare(userId);
		return privateJson({ ok: true });
	});
}
