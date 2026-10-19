import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { DomainMove } from "@/components/DomainMove";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SkipLink } from "@/components/SkipLink";
import { WhatsNew } from "@/components/WhatsNew";
import { localeTag } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";
import { getMessages, getRequestLocale } from "@/i18n/server";
import { requestHost } from "@/lib/auth-url";
import { isMovedHost, SITE_ORIGIN } from "@/lib/site";
import { avatarPath } from "@/server/avatar";
import { withDiscordUid } from "@/server/logger";
import { THEME_COLORS } from "@/theme/config";
import { fontClasses } from "@/theme/fonts";
import { getRequestTheme } from "@/theme/server";
import "./globals.css";
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
		const locale = await getRequestLocale();
		const theme = await getRequestTheme();
		const moved = isMovedHost(requestHost(await headers()));
		const signedIn = Boolean(session?.user?.id);
		return (
			<html
				lang={localeTag(locale)}
				className={fontClasses}
				data-theme={theme ?? undefined}
				style={theme ? { colorScheme: theme } : undefined}
				suppressHydrationWarning
			>
				<body>
					<I18nProvider locale={locale}>
						<SkipLink />
						<div className="shell">
							{moved ? <DomainMove signedIn={signedIn} /> : null}
							<SiteHeader
								signedIn={signedIn}
								name={session?.user?.name}
								image={avatarPath(session?.user?.image)}
								theme={theme ?? "system"}
							/>
							{children}
							<WhatsNew auto={!moved} />
							<SiteFooter />
						</div>
					</I18nProvider>
					<Analytics />
				</body>
			</html>
		);
	});
}
