import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SkipLink } from "@/components/SkipLink";
import { VersionNotice } from "@/components/VersionNotice";
import { localeTag } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";
import { getMessages } from "@/i18n/server";
import { withDiscordUid } from "@/server/logger";
import { THEME_COLORS } from "@/theme/config";
import { fontClasses } from "@/theme/fonts";
import { getRequestTheme } from "@/theme/server";
import "./globals.css";

/** Public origin for absolute OpenGraph URLs; the first AUTH_URLS entry in production */
function siteOrigin(): URL | undefined {
	const raw = process.env.AUTH_URLS?.split(",")[0] || process.env.AUTH_URL;
	if (!raw) return undefined;
	try {
		return new URL(raw.trim());
	} catch {
		return undefined;
	}
}

/** Pages return plain titles; the template adds the brand */
export async function generateMetadata(): Promise<Metadata> {
	const { locale, m } = await getMessages();
	return {
		metadataBase: siteOrigin(),
		title: { default: m.meta.title, template: `%s · ${m.brand}` },
		description: m.meta.description,
		applicationName: m.brand,
		openGraph: {
			type: "website",
			siteName: m.brand,
			locale: locale === "zh" ? "zh_CN" : "en_US",
		},
		twitter: { card: "summary_large_image" },
		formatDetection: { telephone: false },
	};
}

/** theme-color follows the visitor's pick when there is one, else the OS */
export async function generateViewport(): Promise<Viewport> {
	const theme = await getRequestTheme();
	return {
		colorScheme: theme ?? "dark light",
		themeColor: theme
			? THEME_COLORS[theme]
			: [
					{
						media: "(prefers-color-scheme: dark)",
						color: THEME_COLORS.dark,
					},
					{
						media: "(prefers-color-scheme: light)",
						color: THEME_COLORS.light,
					},
				],
	};
}

export default async function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await auth();
	return withDiscordUid(session?.user?.id, async () => {
		const { locale, m } = await getMessages();
		const theme = await getRequestTheme();
		return (
			<html
				lang={localeTag(locale)}
				className={fontClasses}
				data-theme={theme ?? undefined}
				style={theme ? { colorScheme: theme } : undefined}
				suppressHydrationWarning
			>
				<body>
					<I18nProvider locale={locale} m={m}>
						<SkipLink />
						<div className="shell">
							<SiteHeader
								signedIn={Boolean(session?.user?.id)}
								name={session?.user?.name}
								image={session?.user?.image}
								theme={theme ?? "system"}
							/>
							{children}
							{/* before the footer, so keyboard users meet it after the page */}
							<VersionNotice />
							<SiteFooter />
						</div>
					</I18nProvider>
					<Analytics />
				</body>
			</html>
		);
	});
}
