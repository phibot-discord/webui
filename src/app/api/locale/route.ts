import { sessionUserId } from "@/auth";
import { isLocale } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/server";
import { setUserLocale } from "@/phi/lib/notes";
import { getDataHost } from "@/server/data-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	let locale: unknown;
	try {
		const body = (await request.json()) as { locale?: unknown };
		locale = body.locale;
	} catch {
		return Response.json({ error: "bad_locale" }, { status: 400 });
	}
	if (typeof locale !== "string" || !isLocale(locale)) {
		return Response.json({ error: "bad_locale" }, { status: 400 });
	}
	await setLocaleCookie(locale);
	const userId = await sessionUserId();
	if (userId) {
		try {
			const host = await getDataHost();
			await setUserLocale(host.db, userId, locale);
		} catch {
			/* cookie applied */
		}
	}
	return Response.json({ ok: true });
}
