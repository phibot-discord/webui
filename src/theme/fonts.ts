import localFont from "next/font/local";

const display = localFont({
	src: "../fonts/outfit-latin-var.woff2",
	weight: "400 700",
	display: "swap",
	variable: "--font-display",
});

const mono = localFont({
	src: [{ path: "../fonts/jetbrains-mono-latin.woff2", weight: "400 800" }],
	display: "swap",
	preload: false,
	variable: "--font-mono",
	adjustFontFallback: false,
});

export const fontClasses = `${display.variable} ${mono.variable}`;
