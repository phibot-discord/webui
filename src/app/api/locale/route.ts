import { sessionUserId } from "@/auth";
import { isLocale } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/request";
import { setUserLocale } from "@/phi/lib/notes";
import { getDataHost } from "@/server/data-host";
import { codeError, localizedRetryAfter } from "@/server/i18n-http";
import { withDiscordUid } from "@/server/logger";
import { clientIp, rateLimitBy } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const limited = rateLimitBy(`locale:${clientIp(request.headers)}`, 30);
	if (!limited.ok) return localizedRetryAfter(limited.retryAfter, "rate_limit");
	let locale: unknown;
	try {
		const body = (await request.json()) as { locale?: unknown };
		locale = body.locale;
	} catch {
		return codeError(400, "bad_locale");
	}
	if (typeof locale !== "string" || !isLocale(locale)) {
		return codeError(400, "bad_locale");
	}
	await setLocaleCookie(locale);
	const userId = await sessionUserId();
	return withDiscordUid(userId, async () => {
		if (userId) {
			try {
				const host = await getDataHost();
				await setUserLocale(host.db, userId, locale);
			} catch {}
		}
		return Response.json({ ok: true });
	});
}
