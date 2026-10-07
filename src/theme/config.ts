export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
/** What the visitor picked. "system" means no cookie: follow the OS */
export type ThemeChoice = Theme | "system";

export const THEME_COOKIE = "phi-theme";

/** Page background per theme, for <meta name="theme-color">. Matches --bg */
export const THEME_COLORS: Record<Theme, string> = {
	light: "#f5f8fa",
	dark: "#080e16",
};

export function isTheme(v: string | undefined | null): v is Theme {
	return v === "light" || v === "dark";
}
