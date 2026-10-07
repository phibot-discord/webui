"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isLocale, LOCALE_COOKIE, type Locale, localeTag } from "@/i18n/config";
import { en, zh } from "@/i18n/messages";
import { isTheme, THEME_COOKIE, type Theme } from "@/theme/config";
import { fontClasses } from "@/theme/fonts";
import "./globals.css";

function readCookie(name: string): string | undefined {
	const hit = document.cookie
		.split("; ")
		.find((part) => part.startsWith(`${name}=`));
	return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

/** Locale and theme from the visitor's cookies, as one stable string */
function readPrefs(): string {
	const saved = readCookie(LOCALE_COOKIE);
	const locale: Locale = isLocale(saved)
		? saved
		: navigator.language.toLowerCase().startsWith("zh")
			? "zh"
			: "en";
	const theme = readCookie(THEME_COOKIE);
	return `${locale}|${isTheme(theme) ? theme : ""}`;
}

/** Cookies do not change while this page shows; nothing to subscribe to */
function subscribe() {
	return () => {};
}

/** Replaces the root layout when it throws, so it reads locale and theme itself */
export default function GlobalError({
	error,
	retry,
}: {
	error: Error & { digest?: string };
	retry: () => void;
}) {
	const prefs = useSyncExternalStore(subscribe, readPrefs, () => "en|");
	const [locale, pick] = prefs.split("|") as [Locale, string];
	const theme: Theme | undefined = isTheme(pick) ? pick : undefined;
	const m = locale === "zh" ? zh : en;

	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<html
			lang={localeTag(locale)}
			className={fontClasses}
			data-theme={theme}
			style={theme ? { colorScheme: theme } : undefined}
		>
			<body>
				<title>{`${m.error.title} · ${m.brand}`}</title>
				<div className="shell">
					<main id="content" className="page status-page">
						<p className="status-code">{m.error.code}</p>
						<h1>{m.error.title}</h1>
						<p className="lede">{m.error.body}</p>
						<div className="status-actions">
							<button
								className="btn btn-primary"
								type="button"
								onClick={() => retry()}
							>
								{m.error.retry}
							</button>
							{/* A plain link: the root layout is broken, so do a full load */}
							<a className="btn btn-ghost" href="/">
								{m.error.home}
							</a>
						</div>
						{error.digest ? (
							<p className="status-digest">
								{m.error.digest}: {error.digest}
							</p>
						) : null}
					</main>
				</div>
			</body>
		</html>
	);
}
