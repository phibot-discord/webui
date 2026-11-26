import type { ReactNode } from "react";
import { localeTag } from "@/i18n/config";
import { requestLocale } from "@/i18n/request";
import { renderFontClasses } from "@/theme/render-fonts";
import "../globals.css";

export default async function RenderLayout({
	children,
}: {
	children: ReactNode;
}) {
	const locale = await requestLocale();
	return (
		<html lang={localeTag(locale)} className={renderFontClasses}>
			<body>{children}</body>
		</html>
	);
}
