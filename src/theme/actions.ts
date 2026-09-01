"use server";

import { isTheme, type Theme } from "./config";
import { setThemeCookie } from "./server";

export async function setTheme(theme: Theme) {
	if (!isTheme(theme)) return;
	await setThemeCookie(theme);
}
