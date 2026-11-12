import { cache } from "react";
import { localePath } from "@/lib/locale-path";
import { ASKED_PARAM } from "@/lib/safe-next";
import {
	isLocale,
	LOCALE_COOKIE,
	LOCALE_COOKIE_MAX_AGE,
	type Locale,
} from "./config";
import { figuresEn, figuresZh } from "./figure-messages";
import { filesEn, filesZh } from "./files-messages";
import { figuresJa } from "./ja-figure-messages";
import { filesJa } from "./ja-files-messages";
import { ja } from "./ja-messages";
import { en, type Messages } from "./messages";
import { testLocale } from "./request";
import { zh } from "./zh-messages";

export { setRequestLocaleForTest } from "./request";

export const catalogs: Record<Locale, Messages> = {
	en: { ...en, ...filesEn, ...figuresEn },
	zh: { ...zh, ...filesZh, ...figuresZh },
	ja: { ...ja, ...filesJa, ...figuresJa },
};

export const getRequestLocale = cache(resolveRequestLocale);

async function resolveRequestLocale(): Promise<Locale> {
	const forTest = testLocale();
	if (forTest) return forTest;
	const { segmentLocale } = await import("./segment");
	return (await segmentLocale()) ?? "en";
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

export async function signInLink(next: string): Promise<string> {
	return `${await signInHref(next)}&${ASKED_PARAM}=1`;
}

export async function getMessages(): Promise<{ locale: Locale; m: Messages }> {
	const locale = await getRequestLocale();
	return { locale, m: catalogs[locale] };
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
