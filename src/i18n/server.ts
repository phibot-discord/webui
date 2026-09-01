import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, type Locale, negotiateLocale } from "./config";
import { en, type Messages, zh } from "./messages";

export const catalogs: Record<Locale, Messages> = { en, zh };

export async function getRequestLocale(): Promise<Locale> {
	const jar = await cookies();
	const hdrs = await headers();
	const negotiated = negotiateLocale(
		jar.get(LOCALE_COOKIE)?.value,
		hdrs.get("accept-language"),
	);
	try {
		const { sessionUserId } = await import("@/auth");
		const userId = await sessionUserId();
		if (!userId) return negotiated;
		const { getDataHost } = await import("@/server/data-host");
		const { getNotes } = await import("@/phi/lib/notes");
		const host = await getDataHost();
		const notes = await getNotes(host.db, userId);
		if (notes.locale === "en" || notes.locale === "zh") return notes.locale;
	} catch {
		/* KV optional for chrome locale */
	}
	return negotiated;
}

export async function getMessages(): Promise<{ locale: Locale; m: Messages }> {
	const locale = await getRequestLocale();
	return { locale, m: catalogs[locale] };
}

export function formatDateTime(iso: string, locale: Locale): string {
	const d = new Date(iso);
	if (!Number.isFinite(d.getTime())) return iso;
	return d.toLocaleString(locale === "zh" ? "zh-CN" : "en", {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

export async function setLocaleCookie(locale: Locale) {
	const jar = await cookies();
	jar.set(LOCALE_COOKIE, locale, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		sameSite: "lax",
	});
}
