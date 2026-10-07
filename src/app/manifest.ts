import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/theme/config";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "PhiBot",
		short_name: "PhiBot",
		description:
			"Look up your Phigros B30, history, and player info. The same cards as the Discord bot.",
		start_url: "/",
		display: "standalone",
		background_color: THEME_COLORS.dark,
		theme_color: THEME_COLORS.dark,
		icons: [
			{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
			{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
			{
				src: "/icons/icon-maskable-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
