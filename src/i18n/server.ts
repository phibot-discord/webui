import { cookies, headers } from "next/headers";
import { cache } from "react";
import {
	isLocale,
	LOCALE_COOKIE,
	type Locale,
	negotiateLocale,
} from "./config";
import { en, type Messages, zh } from "./messages";

export const catalogs: Record<Locale, Messages> = { en, zh };

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const getRequestLocale = cache(resolveRequestLocale);

/** Cookie, then Accept-Language; page renders never read notes for this */
async function resolveRequestLocale(): Promise<Locale> {
	const jar = await cookies();
	const cookie = jar.get(LOCALE_COOKIE)?.value;
	if (isLocale(cookie)) return cookie;
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
		maxAge: LOCALE_COOKIE_MAX_AGE,
		sameSite: "lax",
		httpOnly: false,
	});
}

/** The same cookie as `setLocaleCookie`, as a Set-Cookie value for a plain Response */
export function localeSetCookie(locale: Locale): string {
	return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function cookieLocale(reqHeaders: Headers): Locale | undefined {
	const raw = reqHeaders.get("cookie");
	if (!raw) return;
	for (const part of raw.split(";")) {
		const eq = part.indexOf("=");
		if (eq < 0 || part.slice(0, eq).trim() !== LOCALE_COOKIE) continue;
		const value = part.slice(eq + 1).trim();
		if (isLocale(value)) return value;
	}
}
