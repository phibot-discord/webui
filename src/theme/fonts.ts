import localFont from "next/font/local";

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

export const mono = localFont({
	src: [{ path: "../fonts/jetbrains-mono-latin.woff2", weight: "400 800" }],
	display: "swap",
	preload: false,
	variable: "--font-mono",
});

export const fontClasses = `${cjk.variable} ${display.variable} ${mono.variable}`;
