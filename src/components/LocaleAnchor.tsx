"use client";

import type { ComponentProps } from "react";
import { useI18n } from "@/i18n/provider";
import { localePath } from "@/lib/locale-path";

export function LocaleAnchor({
	href,
	...props
}: ComponentProps<"a"> & { href: string }) {
	const { locale } = useI18n();
	return <a {...props} href={localePath(href, locale)} />;
}
