"use client";

import { useI18n } from "@/i18n/provider";

export function SkipLink() {
	const { m } = useI18n();
	return (
		<a className="skip" href="#content">
			{m.skip}
		</a>
	);
}
