"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import { LOCALE_COOKIE, type Locale, localeTag } from "./config";
import { en, type Messages, zh } from "./messages";

const catalogs: Record<Locale, Messages> = { en, zh };

const I18nContext = createContext<{
	locale: Locale;
	m: Messages;
	setLocale: (locale: Locale) => void;
} | null>(null);

function writeLocaleCookie(locale: Locale) {
	// Instant client cookie so the next navigation does not wait on /api/locale.
	// biome-ignore lint/suspicious/noDocumentCookie: not httpOnly; Cookie Store is not universal
	document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function I18nProvider({
	locale: initialLocale,
	m: initialM,
	children,
}: {
	locale: Locale;
	m: Messages;
	children: ReactNode;
}) {
	const [locale, setLocaleState] = useState(initialLocale);
	const m = locale === initialLocale ? initialM : catalogs[locale];

	const setLocale = useCallback(
		(next: Locale) => {
			if (next === locale) return;
			setLocaleState(next);
			document.documentElement.lang = localeTag(next);
			writeLocaleCookie(next);
			void fetch("/api/locale", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ locale: next }),
				keepalive: true,
			});
		},
		[locale],
	);

	return (
		<I18nContext.Provider value={{ locale, m, setLocale }}>
			{children}
		</I18nContext.Provider>
	);
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within I18nProvider");
	return ctx;
}
