import type { Metadata } from "next";
import { type Locale, localeTag } from "@/i18n/config";
import { privacy, terms } from "@/i18n/legal";
import { catalogs, getMessages } from "@/i18n/server";
import { localeAlternates, localePath } from "@/lib/locale-path";
import { OG_SIZE, type OgPage, ogPageUrl } from "@/lib/og";
import { AUTHOR_URL, SITE_ORIGIN } from "@/lib/site";
import { fill } from "@/phi/lib/card-i18n";
import { loadHiddenSong } from "./c9s6";

export type TitleCardPage = Exclude<OgPage, "home">;

type OgCopy = {
	title?: string;
	description?: string;
	url?: string;
	type?: "website" | "profile";
};

/** The whole `openGraph` and `twitter` objects: Next replaces a parent's rather than merging into it */
export async function ogMetadata(
	image: { url: string; alt: string },
	copy: OgCopy = {},
): Promise<Pick<Metadata, "openGraph" | "twitter">> {
	const { locale, m } = await getMessages();
	const images = [{ ...image, ...OG_SIZE }];
	const { title, description } = copy;
	return {
		openGraph: {
			type: copy.type ?? "website",
			siteName: m.brand,
			locale: locale === "zh" ? "zh_CN" : "en_US",
			title,
			description,
			url: copy.url,
			images,
		},
		twitter: { card: "summary_large_image", title, description, images },
	};
}

export async function pageOg(
	id: OgPage,
	copy: OgCopy = {},
): Promise<Pick<Metadata, "openGraph" | "twitter">> {
	const { locale, m } = await getMessages();
	const alt =
		id === "home" || !copy.title
			? m.og.cardAlt
			: fill(m.og.pageAlt, { title: copy.title });
	return ogMetadata({ url: ogPageUrl(id, locale), alt }, copy);
}

/** A page's title and lede, shared by its metadata and its title card */
export async function pageCopy(
	id: TitleCardPage,
	locale: Locale,
): Promise<{ title: string; lede: string }> {
	const m = catalogs[locale];
	switch (id) {
		case "tos":
			return { title: m.legal.terms, lede: terms[locale].lede };
		case "privacy":
			return { title: m.legal.privacy, lede: privacy[locale].lede };
		case "c9s6": {
			const song = await loadHiddenSong().catch(() => null);
			return { title: song?.name ?? m.c9s6.title, lede: m.c9s6.lede };
		}
		case "cards":
			return { title: m.me.title, lede: m.meta.description };
		case "login":
			return { title: m.tapLogin.title, lede: m.tapLogin.lede };
		default:
			return { title: m[id].title, lede: m[id].lede };
	}
}

/** Canonical in this locale, plus every locale's URL for hreflang */
function localeAlternatesOf(path: string, locale: Locale) {
	return {
		canonical: localePath(path, locale),
		languages: localeAlternates(path),
	};
}

export type PageMetaOpts = {
	noindex?: boolean;
	path?: string;
	title?: string;
	description?: string;
};

/** A page's title, description and share card; `path` is its canonical URL, `noindex` keeps it out of search results */
export async function pageMetadata(
	id: TitleCardPage,
	opts: PageMetaOpts = {},
): Promise<Metadata> {
	const { locale } = await getMessages();
	const { title, lede } = await pageCopy(id, locale);
	const copy = {
		title: opts.title ?? title,
		description: opts.description ?? lede,
	};
	const url = opts.path && localePath(opts.path, locale);
	return {
		...copy,
		...(opts.noindex ? { robots: { index: false } } : {}),
		...(opts.path ? { alternates: localeAlternatesOf(opts.path, locale) } : {}),
		...(await pageOg(id, { ...copy, url })),
	};
}

/** schema.org WebSite for the landing page; WebApplication is left out, Google wants ratings on it */
export async function siteJsonLd() {
	const { locale, m } = await getMessages();
	const url = `${SITE_ORIGIN}/`;
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${url}#website`,
		url: `${SITE_ORIGIN}${localePath("/", locale)}`,
		name: m.brand,
		alternateName: m.meta.title,
		description: m.meta.description,
		inLanguage: localeTag(locale),
		isAccessibleForFree: true,
		author: { "@type": "Person", name: m.credit.name, url: AUTHOR_URL },
	};
}

/** The landing page's metadata; `/home` shows the same page, so both name `/` as canonical */
export async function homeMetadata(): Promise<Metadata> {
	const { locale, m } = await getMessages();
	const copy = { title: m.meta.title, description: m.meta.description };
	return {
		title: { absolute: copy.title },
		description: copy.description,
		alternates: localeAlternatesOf("/", locale),
		...(await pageOg("home", { ...copy, url: localePath("/", locale) })),
	};
}
