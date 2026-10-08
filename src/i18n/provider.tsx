"use client";

import { useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { bumpCardReload } from "@/lib/save-refresh";
import { LOCALE_COOKIE, type Locale, localeTag } from "./config";
import { en, type Messages, zh } from "./messages";

const catalogs: Record<Locale, Messages> = { en, zh };

const I18nContext = createContext<{
	locale: Locale;
	m: Messages;
	setLocale: (locale: Locale) => void;
} | null>(null);

function writeLocaleCookie(locale: Locale) {
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
	const router = useRouter();
	const [locale, setLocaleState] = useState(initialLocale);
	const m = locale === initialLocale ? initialM : catalogs[locale];

	const setLocale = useCallback(
		(next: Locale) => {
			if (next === locale) return;
			setLocaleState(next);
			document.documentElement.lang = localeTag(next);
			writeLocaleCookie(next);
			bumpCardReload();
			void fetch("/api/locale", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ locale: next }),
				keepalive: true,
			})
				.catch(() => {})
				.finally(() => router.refresh());
		},
		[locale, router],
	);

	const value = useMemo(
		() => ({ locale, m, setLocale }),
		[locale, m, setLocale],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within I18nProvider");
	return ctx;
}
