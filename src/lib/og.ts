import type { Locale } from "@/i18n/config";

/** `home` is the owner's B30 card; the rest are title cards rendered from their page's copy */
export const OG_PAGES = [
	"home",
	"songs",
	"score",
	"phira",
	"mp",
	"status",
	"tos",
	"privacy",
	"files",
	"pv",
	"collection",
	"texts",
	"timeline",
	"c9s6",
	"cards",
	"tags",
	"simulate",
	"manual",
	"account",
	"login",
] as const;
export type OgPage = (typeof OG_PAGES)[number];

/** Part of every image URL: bump it when the images change, so CDNs and chat embeds fetch them again */
export const OG_VERSION = "2";
export const OG_SIZE = { width: 1200, height: 630 } as const;

export function isOgPage(v: string): v is OgPage {
	return (OG_PAGES as readonly string[]).includes(v);
}

export function ogPageUrl(id: OgPage, locale: Locale): string {
	return `/api/og/${id}?lang=${locale}&v=${OG_VERSION}`;
}

export function ogShareUrl(slug: string, kind: string, locale: Locale): string {
	return `/api/og/share/${encodeURIComponent(slug)}/${encodeURIComponent(kind)}?lang=${locale}&v=${OG_VERSION}`;
}
