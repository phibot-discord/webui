import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";
import { localeAlternates, localePath } from "@/lib/locale-path";
import { SITE_ORIGIN } from "@/lib/site";

export const SITEMAP_PAGES = [
	"/",
	"/songs",
	"/charts",
	"/score",
	"/phira",
	"/guess",
	"/timing",
	"/tiers",
	"/versions",
	"/status",
	"/privacy",
	"/tos",
];

/** Next writes these into the XML as they are */
const absolute = (path: string) =>
	`${SITE_ORIGIN}${path}`.replaceAll("&", "&amp;");

export function sitemapEntries(paths: string[]): MetadataRoute.Sitemap {
	return paths.flatMap((path) => {
		const languages = Object.fromEntries(
			Object.entries(localeAlternates(path)).map(([lang, href]) => [
				lang,
				absolute(href),
			]),
		);
		return LOCALES.map((locale) => ({
			url: absolute(localePath(path, locale)),
			alternates: { languages },
		}));
	});
}
