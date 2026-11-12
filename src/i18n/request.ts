import { cookies, headers } from "next/headers";
import { LOCALE_HEADER, localePath } from "@/lib/locale-path";
import {
	isLocale,
	LOCALE_COOKIE,
	LOCALE_COOKIE_MAX_AGE,
	type Locale,
	negotiateLocale,
} from "./config";

let localeOverride: Locale | undefined;

export function setRequestLocaleForTest(locale?: Locale): void {
	if (process.env.PHI_TEST_SEAMS !== "1") return;
	localeOverride = locale;
}

export function testLocale(): Locale | undefined {
	return localeOverride;
}

export function pickRequestLocale(
	fromUrl: string | null,
	cookie: string | undefined,
	acceptLanguage: string | null,
): Locale {
	if (isLocale(fromUrl)) return fromUrl;
	if (isLocale(cookie)) return cookie;
	return negotiateLocale(undefined, acceptLanguage);
}

/** The page URL's locale (set by the proxy), else cookie, then Accept-Language; never the notes */
export async function requestLocale(): Promise<Locale> {
	if (localeOverride) return localeOverride;
	const hdrs = await headers();
	const jar = await cookies();
	return pickRequestLocale(
		hdrs.get(LOCALE_HEADER),
		jar.get(LOCALE_COOKIE)?.value,
		hdrs.get("accept-language"),
	);
}

export async function requestLocaleHref(path: string): Promise<string> {
	return localePath(path, await requestLocale());
}

export async function requestSignInHref(next: string): Promise<string> {
	const locale = await requestLocale();
	return `${localePath("/", locale)}?next=${encodeURIComponent(localePath(next, locale))}`;
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
