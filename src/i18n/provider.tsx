"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages";

const I18nContext = createContext<{ locale: Locale; m: Messages } | null>(null);

export function I18nProvider({
	locale,
	m,
	children,
}: {
	locale: Locale;
	m: Messages;
	children: ReactNode;
}) {
	return (
		<I18nContext.Provider value={{ locale, m }}>
			{children}
		</I18nContext.Provider>
	);
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within I18nProvider");
	return ctx;
}
