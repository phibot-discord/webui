import { cookies } from "next/headers";
import { isTheme, THEME_COOKIE, type Theme } from "./config";

export async function getRequestTheme(): Promise<Theme | null> {
	const jar = await cookies();
	const v = jar.get(THEME_COOKIE)?.value;
	return isTheme(v) ? v : null;
}

export async function setThemeCookie(theme: Theme) {
	const jar = await cookies();
	jar.set(THEME_COOKIE, theme, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		sameSite: "lax",
	});
}
