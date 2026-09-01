"use client";

import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

export function LocaleSwitch() {
	const { locale, m, setLocale } = useI18n();

	function pick(next: Locale) {
		if (next === locale) return;
		setLocale(next);
	}

	return (
		<fieldset className="locale-switch" aria-label={m.locale.label}>
			<button
				type="button"
				aria-pressed={locale === "en"}
				onClick={() => pick("en")}
			>
				{m.locale.en}
			</button>
			<button
				type="button"
				aria-pressed={locale === "zh"}
				onClick={() => pick("zh")}
			>
				{m.locale.zh}
			</button>
		</fieldset>
	);
}
