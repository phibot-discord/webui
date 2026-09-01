"use server";

import { sessionUserId } from "@/auth";
import { setUserLocale } from "@/phi/lib/notes";
import { getDataHost } from "@/server/data-host";
import { isLocale, type Locale } from "./config";
import { setLocaleCookie } from "./server";

export async function setLocale(locale: Locale) {
	if (!isLocale(locale)) return;
	await setLocaleCookie(locale);
	const userId = await sessionUserId();
	if (!userId) return;
	try {
		const host = await getDataHost();
		await setUserLocale(host.db, userId, locale);
	} catch {
		/* cookie applied */
	}
}
