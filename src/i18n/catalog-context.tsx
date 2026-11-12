import { createContext, type ReactNode, useMemo } from "react";
import type { Locale } from "./config";
import type { ClientMessages } from "./messages";

export type CatalogProps = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	children: ReactNode;
};

export const I18nContext = createContext<{
	locale: Locale;
	m: ClientMessages;
	setLocale: (locale: Locale) => void;
} | null>(null);

export function CatalogProvider({
	messages,
	locale,
	setLocale,
	children,
}: CatalogProps & { messages: ClientMessages }) {
	const value = useMemo(
		() => ({ locale, m: messages, setLocale }),
		[locale, messages, setLocale],
	);
	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
