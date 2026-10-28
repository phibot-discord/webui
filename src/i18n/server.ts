import { cookies, headers } from "next/headers";
import { cache } from "react";
import { LOCALE_HEADER, localePath } from "@/lib/locale-path";
import {
	isLocale,
	LOCALE_COOKIE,
	type Locale,
	negotiateLocale,
} from "./config";
import { figuresEn, figuresZh } from "./figure-messages";
import { filesEn, filesZh } from "./files-messages";
import { en, type Messages, zh } from "./messages";

export const catalogs: Record<Locale, Messages> = {
	en: { ...en, ...filesEn, ...figuresEn },
	zh: { ...zh, ...filesZh, ...figuresZh },
};

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const getRequestLocale = cache(resolveRequestLocale);

/** The page URL's locale (set by the proxy), else cookie, then Accept-Language; never the notes */
async function resolveRequestLocale(): Promise<Locale> {
	const hdrs = await headers();
	const fromUrl = hdrs.get(LOCALE_HEADER);
	if (isLocale(fromUrl)) return fromUrl;
	const jar = await cookies();
	const cookie = jar.get(LOCALE_COOKIE)?.value;
	if (isLocale(cookie)) return cookie;
	return negotiateLocale(undefined, hdrs.get("accept-language"));
}

/** `path` in the locale of the page being rendered */
export async function localeHref(path: string): Promise<string> {
	return localePath(path, await getRequestLocale());
}

/** The landing page, which signs in and then opens `next`, in this page's locale */
export async function signInHref(next: string): Promise<string> {
	const locale = await getRequestLocale();
	return `${localePath("/", locale)}?next=${encodeURIComponent(localePath(next, locale))}`;
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
