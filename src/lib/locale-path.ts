import { type Locale, LOCALES } from "@/i18n/config";

export const LOCALE_HEADER = "x-phi-locale";

const PREFIXED = /^\/(zh|ja)(?=[/?#]|$)/;
const UNLOCALIZED =
	/^\/(?:api|_next|render)(?=[/?#]|$)|^[^?#]*\.[a-z0-9]+(?=[?#]|$)/i;

export function pathLocale(path: string): Locale {
	const hit = PREFIXED.exec(path)?.[1];
	return hit === "zh" || hit === "ja" ? hit : "en";
}

export function stripLocale(path: string): string {
	const hit = PREFIXED.exec(path);
	if (!hit) return path;
	const rest = path.slice(hit[0].length);
	return rest.startsWith("/") ? rest : `/${rest}`;
}

export function localePath(path: string, locale: Locale): string {
	if (!path.startsWith("/") || path.startsWith("//")) return path;
	const bare = stripLocale(path);
	if (locale === "en" || UNLOCALIZED.test(bare)) return bare;
	const prefix = `/${locale}`;
	return bare === "/" || bare[1] === "?" || bare[1] === "#"
		? `${prefix}${bare.slice(1)}`
		: `${prefix}${bare}`;
}

export function localeAlternates(path: string): Record<string, string> {
	return {
		...Object.fromEntries(
			LOCALES.map((locale) => [locale, localePath(path, locale)]),
		),
		"x-default": localePath(path, "en"),
	};
}
