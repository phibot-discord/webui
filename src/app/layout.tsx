import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { localeTag } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";
import { getMessages } from "@/i18n/server";
import { THEME_BOOT } from "@/theme/config";
import { getRequestTheme } from "@/theme/server";
import "./globals.css";

const cjk = localFont({
	src: [
		{ path: "../fonts/noto-sans-sc-400.woff2", weight: "400" },
		{ path: "../fonts/noto-sans-sc-500.woff2", weight: "500" },
		{ path: "../fonts/noto-sans-sc-600.woff2", weight: "600" },
	],
	display: "swap",
	preload: false,
	variable: "--font-cjk",
	adjustFontFallback: false,
});

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.meta.title, description: m.meta.description };
}

export default async function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await auth();
	const { locale, m } = await getMessages();
	const theme = await getRequestTheme();
	return (
		<html
			lang={localeTag(locale)}
			className={cjk.variable}
			data-theme={theme ?? undefined}
			style={theme ? { colorScheme: theme } : undefined}
			suppressHydrationWarning
		>
			<body>
				<Script id="phi-theme" strategy="beforeInteractive">
					{THEME_BOOT}
				</Script>
				<I18nProvider locale={locale} m={m}>
					<a className="skip" href="#content">
						{m.skip}
					</a>
					<div className="shell">
						<SiteHeader
							signedIn={Boolean(session?.user?.id)}
							name={session?.user?.name}
							image={session?.user?.image}
							m={m}
						/>
						{children}
						<SiteFooter m={m} />
					</div>
				</I18nProvider>
				<Analytics />
			</body>
		</html>
	);
}
