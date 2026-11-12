const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export type ThemeChoice = Theme | "system";

export const THEME_COOKIE = "phi-theme";

/** For <meta name="theme-color">; matches --bg */
export const THEME_COLORS: Record<Theme, string> = {
	light: "#f5f8fa",
	dark: "#080e16",
};

export function isTheme(v: string | undefined | null): v is Theme {
	return v === "light" || v === "dark";
}

export function themeFromCookie(cookie: string): Theme | null {
	for (const part of cookie.split(";")) {
		const entry = part.trim();
		const eq = entry.indexOf("=");
		if (eq < 0 || entry.slice(0, eq) !== THEME_COOKIE) continue;
		const value = entry.slice(eq + 1);
		return isTheme(value) ? value : null;
	}
	return null;
}
