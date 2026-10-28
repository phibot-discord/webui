import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";
import { localeAlternates, localePath } from "@/lib/locale-path";
import { SITE_ORIGIN } from "@/lib/site";
import { filesSitemapPaths } from "@/server/files-page";

export const revalidate = 86400;

const PAGES = [
	"/",
	"/songs",
	"/score",
	"/phira",
	"/status",
	"/privacy",
	"/tos",
];

/** Next writes these into the XML as they are */
const absolute = (path: string) =>
	`${SITE_ORIGIN}${path}`.replaceAll("&", "&amp;");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const files = await filesSitemapPaths().catch(() => ["/files"]);
	return [...PAGES, ...files].flatMap((path) => {
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
