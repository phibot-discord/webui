import { cookies, headers } from "next/headers";
import {
	isLocale,
	LOCALE_COOKIE,
	type Locale,
	negotiateLocale,
} from "./config";
import { en, type Messages, zh } from "./messages";

export { formatDateTime } from "./datetime";

export const catalogs: Record<Locale, Messages> = { en, zh };

export async function getRequestLocale(): Promise<Locale> {
	const jar = await cookies();
	const cookie = jar.get(LOCALE_COOKIE)?.value;
	if (isLocale(cookie)) return cookie;
	try {
		const { sessionUserId } = await import("@/auth");
		const userId = await sessionUserId();
		if (userId) {
			const { getDataHost } = await import("@/server/data-host");
			const { getNotes } = await import("@/phi/lib/notes");
			const host = await getDataHost();
			const notes = await getNotes(host.db, userId);
			if (notes.locale === "en" || notes.locale === "zh") return notes.locale;
		}
	} catch {
		/* KV optional for chrome locale */
	}
	const hdrs = await headers();
	return negotiateLocale(undefined, hdrs.get("accept-language"));
}

export async function getMessages(): Promise<{ locale: Locale; m: Messages }> {
	const locale = await getRequestLocale();
	return { locale, m: catalogs[locale] };
}

export async function setLocaleCookie(locale: Locale) {
	const jar = await cookies();
	jar.set(LOCALE_COOKIE, locale, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		sameSite: "lax",
		httpOnly: false,
	});
}
