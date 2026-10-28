import type { Locale } from "@/i18n/config";

/** English pages live at bare paths, Chinese ones under this prefix */
export const ZH_PREFIX = "/zh";
/** Set by the proxy on every page request: the locale the URL asked for */
export const LOCALE_HEADER = "x-phi-locale";

const ZH_PATH = /^\/zh(?=[/?#]|$)/;
const UNLOCALIZED =
	/^\/(?:api|_next|render)(?=[/?#]|$)|^[^?#]*\.[a-z0-9]+(?=[?#]|$)/i;

export function pathLocale(path: string): Locale {
	return ZH_PATH.test(path) ? "zh" : "en";
}

/** `path` without its locale prefix; `/zh` and `/zh?x` become `/` and `/?x` */
export function stripLocale(path: string): string {
	if (!ZH_PATH.test(path)) return path;
	const rest = path.slice(ZH_PREFIX.length);
	return rest.startsWith("/") ? rest : `/${rest}`;
}

/** An internal page path in `locale`; external links, API routes and files pass through */
export function localePath(path: string, locale: Locale): string {
	if (!path.startsWith("/") || path.startsWith("//")) return path;
	const bare = stripLocale(path);
	if (locale === "en" || UNLOCALIZED.test(bare)) return bare;
	return bare === "/" || bare[1] === "?" || bare[1] === "#"
		? `${ZH_PREFIX}${bare.slice(1)}`
		: `${ZH_PREFIX}${bare}`;
}

/** Each locale's URL of a page, plus x-default, for `alternates.languages` */
export function localeAlternates(path: string): Record<string, string> {
	return {
		en: localePath(path, "en"),
		zh: localePath(path, "zh"),
		"x-default": localePath(path, "en"),
	};
}
