import { cookies } from "next/headers";
import { isTheme, THEME_COOKIE, type Theme } from "./config";

export async function getRequestTheme(): Promise<Theme | null> {
	const jar = await cookies();
	const v = jar.get(THEME_COOKIE)?.value;
	return isTheme(v) ? v : null;
}
