"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/i18n/provider";
import { localePath } from "@/lib/locale-path";

export default function Link({
	href,
	...props
}: ComponentProps<typeof NextLink>) {
	const { locale } = useI18n();
	const to =
		typeof href === "string"
			? localePath(href, locale)
			: {
					...href,
					pathname: href.pathname && localePath(href.pathname, locale),
				};
	return <NextLink {...props} href={to} />;
}
