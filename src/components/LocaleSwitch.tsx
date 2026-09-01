"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

export function LocaleSwitch() {
	const { locale, m } = useI18n();
	const router = useRouter();
	const [pending, start] = useTransition();

	function pick(next: Locale) {
		if (next === locale || pending) return;
		start(async () => {
			await setLocale(next);
			router.refresh();
		});
	}

	return (
		<fieldset className="locale-switch" aria-label={m.locale.label}>
			<button
				type="button"
				aria-pressed={locale === "en"}
				disabled={pending}
				onClick={() => pick("en")}
			>
				{m.locale.en}
			</button>
			<button
				type="button"
				aria-pressed={locale === "zh"}
				disabled={pending}
				onClick={() => pick("zh")}
			>
				{m.locale.zh}
			</button>
		</fieldset>
	);
}
