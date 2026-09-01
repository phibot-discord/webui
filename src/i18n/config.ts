export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "phi-locale";

export function isLocale(v: string | undefined | null): v is Locale {
	return v === "en" || v === "zh";
}

export function localeTag(locale: Locale): string {
	return locale === "zh" ? "zh-CN" : "en";
}

/** Cookie wins; otherwise the highest-q zh/en tag in Accept-Language. */
export function negotiateLocale(
	cookie: string | undefined,
	acceptLanguage: string | null,
): Locale {
	if (isLocale(cookie)) return cookie;
	if (!acceptLanguage) return DEFAULT_LOCALE;
	const parts = acceptLanguage.split(",").map((raw) => {
		const [tag, ...params] = raw.trim().split(";");
		const qParam = params.find((p) => p.trim().startsWith("q="));
		const q = qParam ? Number(qParam.split("=")[1]) : 1;
		return {
			tag: (tag || "").trim().toLowerCase(),
			q: Number.isFinite(q) ? q : 0,
		};
	});
	parts.sort((a, b) => b.q - a.q);
	for (const p of parts) {
		if (p.tag === "*" || !p.tag) continue;
		if (p.tag === "zh" || p.tag.startsWith("zh-")) return "zh";
		if (p.tag === "en" || p.tag.startsWith("en-")) return "en";
	}
	return DEFAULT_LOCALE;
}
