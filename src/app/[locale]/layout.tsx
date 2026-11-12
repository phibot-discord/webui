import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BackToTop } from "@/components/BackToTop";
import { RecapPrompt } from "@/components/review/RecapPrompt";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SkipLink } from "@/components/SkipLink";
import { WhatsNew } from "@/components/WhatsNew";
import { isLocale, LOCALES, localeTag } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";
import { getMessages } from "@/i18n/server";
import { SITE_ORIGIN } from "@/lib/site";
import { THEME_COLORS } from "@/theme/config";
import { fontClasses } from "@/theme/fonts";
import { THEME_SCRIPT } from "@/theme/script";
import "../globals.css";
import { pageOg } from "@/server/og-meta";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return {
		metadataBase: new URL(SITE_ORIGIN),
		title: { default: m.meta.title, template: `%s · ${m.brand}` },
		description: m.meta.description,
		applicationName: m.brand,
		...(await pageOg("home", {
			title: m.meta.title,
			description: m.meta.description,
		})),
		formatDetection: { telephone: false },
	};
}

export const viewport: Viewport = {
	colorScheme: "dark light",
	themeColor: [
		{ media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
		{ media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
	],
};

export function generateStaticParams() {
	return LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	return (
		<html
			lang={localeTag(locale)}
			className={fontClasses}
			data-scroll-behavior="smooth"
			suppressHydrationWarning
		>
			<head>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script built from our own cookie name
					dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
				/>
			</head>
			<body>
				<I18nProvider locale={locale}>
					<SkipLink />
					<div className="shell">
						<SiteHeader />
						{children}
						<WhatsNew />
						<RecapPrompt />
						<SiteFooter />
						<BackToTop />
					</div>
				</I18nProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
