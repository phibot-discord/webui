import { Noto_Sans_SC } from "next/font/google";
import { fontClasses } from "./fonts";

const cjk = Noto_Sans_SC({
	weight: ["400", "500", "600"],
	display: "swap",
	preload: false,
	variable: "--font-cjk",
	adjustFontFallback: false,
});

export const renderFontClasses = `${fontClasses} ${cjk.variable}`;
