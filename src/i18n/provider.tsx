"use client";

import { usePathname, useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import { localePath, pathLocale, stripLocale } from "@/lib/locale-path";
import { bumpCardReload } from "@/lib/save-refresh";
import { LOCALE_COOKIE, type Locale, localeTag } from "./config";
import { type ClientMessages, en, zh } from "./messages";

const catalogs: Record<Locale, ClientMessages> = { en, zh };

const I18nContext = createContext<{
	locale: Locale;
	m: ClientMessages;
	setLocale: (locale: Locale) => void;
} | null>(null);

function writeLocaleCookie(locale: Locale) {
	// biome-ignore lint/suspicious/noDocumentCookie: not httpOnly; Cookie Store is not universal
	document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function I18nProvider({
	locale: initialLocale,
	children,
}: {
	locale: Locale;
	children: ReactNode;
}) {
	const router = useRouter();
	const path = usePathname();
	const [locale, setLocaleState] = useState(initialLocale);
	const [seenPath, setSeenPath] = useState(path);
	const [, startTransition] = useTransition();
	if (seenPath !== path) {
		setSeenPath(path);
		if (!stripLocale(path).startsWith("/render/")) {
			setLocaleState(pathLocale(path));
		}
	}
	const m = catalogs[locale];

	useEffect(() => {
		document.documentElement.lang = localeTag(locale);
	}, [locale]);

	const setLocale = useCallback(
		(next: Locale) => {
			if (next === locale) return;
			writeLocaleCookie(next);
			bumpCardReload();
			void fetch("/api/locale", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ locale: next }),
				keepalive: true,
			}).catch(() => {});
			const { pathname, search, hash } = window.location;
			const to = localePath(pathname + search + hash, next);
			if (to !== pathname + search + hash) {
				window.location.assign(to);
				return;
			}
			startTransition(() => {
				setLocaleState(next);
				router.refresh();
			});
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
