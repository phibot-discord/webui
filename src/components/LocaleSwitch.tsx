"use client";

import { useId } from "react";
import { LOCALES, localeTag } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

export function LocaleSwitch() {
	const { locale, m, setLocale } = useI18n();
	const labelId = useId();

	return (
		// biome-ignore lint/a11y/useSemanticElements: a <fieldset> legend cannot sit inline in the flex row, so this is a labelled group
		<div
			className="switch locale-switch"
			role="group"
			aria-labelledby={labelId}
		>
			<span className="switch-label" id={labelId}>
				{m.locale.label}
			</span>
			<span className="switch-options">
				{LOCALES.map((value) => (
					<button
						key={value}
						type="button"
						lang={localeTag(value)}
						aria-pressed={locale === value}
						onClick={() => setLocale(value)}
					>
						{m.locale[value]}
					</button>
				))}
			</span>
		</div>
	);
}
