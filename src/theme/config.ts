export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "phi-theme";

export function isTheme(v: string | undefined | null): v is Theme {
	return v === "light" || v === "dark";
}

/** Runs in <head> before paint so the first frame matches cookie or prefers-color-scheme. */
export const THEME_BOOT = `(function(){try{var m=document.cookie.match(/(?:^|; )phi-theme=([^;]*)/);var t=m?decodeURIComponent(m[1]):null;if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var r=document.documentElement;r.setAttribute("data-theme",t);r.style.colorScheme=t;}catch(e){}})();`;
