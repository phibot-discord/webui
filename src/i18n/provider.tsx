"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
	useTransition,
} from "react";
import { localePath, pathLocale, stripLocale } from "@/lib/locale-path";
import { bumpCardReload } from "@/lib/save-refresh";
import { I18nContext } from "./catalog-context";
import { LOCALE_COOKIE, type Locale, localeTag } from "./config";

const CatalogEn = dynamic(() => import("./catalog-en"));
const CatalogZh = dynamic(() => import("./catalog-zh"));
const CatalogJa = dynamic(() => import("./catalog-ja"));
const CATALOGS = { en: CatalogEn, zh: CatalogZh, ja: CatalogJa };

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

	const Catalog = CATALOGS[locale];
	return (
		<Catalog locale={locale} setLocale={setLocale}>
			{children}
		</Catalog>
	);
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within I18nProvider");
	return ctx;
}
