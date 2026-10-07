import localFont from "next/font/local";

/** Noto Sans SC subset; loaded on demand for Chinese text */
export const cjk = localFont({
	src: [
		{ path: "../fonts/noto-sans-sc-400.woff2", weight: "400" },
		{ path: "../fonts/noto-sans-sc-500.woff2", weight: "500" },
		{ path: "../fonts/noto-sans-sc-600.woff2", weight: "600" },
	],
	display: "swap",
	preload: false,
	variable: "--font-cjk",
	adjustFontFallback: false,
});

/** Outfit, the display and UI face */
export const display = localFont({
	src: [
		{ path: "../fonts/outfit-latin-400.woff2", weight: "400" },
		{ path: "../fonts/outfit-latin-500.woff2", weight: "500" },
		{ path: "../fonts/outfit-latin-600.woff2", weight: "600" },
		{ path: "../fonts/outfit-latin-700.woff2", weight: "700" },
	],
	display: "swap",
	variable: "--font-display",
});

/** Classes for <html> that define --font-cjk and --font-display */
export const fontClasses = `${cjk.variable} ${display.variable}`;
