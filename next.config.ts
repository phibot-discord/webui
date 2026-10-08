import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

// Keys are picomatch globs: a pattern without "/" matches at any depth, and includes apply after excludes

const phiRenderAssets = [
	"./phi-assets/html/**/*.{art,css,woff2,ttf,otf,png,jpg,jpeg,webp,svg}",
	"./phi-assets/info/**/*",
	"./src/fonts/noto-sans-sc-400.woff2",
];
const phiInfoOnly = ["./phi-assets/info/**/*"];

// Vercel runs linux x64 glibc; Turbopack ignores extglobs, hence the list
const foreignBinaries = [
	"**/@img/sharp-darwin-*/**",
	"**/@img/sharp-libvips-darwin-*/**",
	"**/@img/sharp-linuxmusl-*/**",
	"**/@img/sharp-libvips-linuxmusl-*/**",
	"**/@img/sharp-linux-arm*/**",
	"**/@img/sharp-libvips-linux-arm*/**",
	"**/@img/sharp-linux-ppc64/**",
	"**/@img/sharp-libvips-linux-ppc64/**",
	"**/@img/sharp-linux-riscv64/**",
	"**/@img/sharp-libvips-linux-riscv64/**",
	"**/@img/sharp-linux-s390x/**",
	"**/@img/sharp-libvips-linux-s390x/**",
	"**/@img/sharp-win32-*/**",
	"**/@img/sharp-wasm32/**",
	"**/@takumi-rs/core-darwin-*/**",
	"**/@takumi-rs/core-linux-arm64-*/**",
	"**/@takumi-rs/core-linux-x64-musl/**",
	"**/@takumi-rs/core-win32-*/**",
	"**/@takumi-rs/wasm/**",
];

// "/api/public/?slug?/route" is /api/public/[slug] alone (Turbopack route names end in /route)
export const nonCardRoutes = [
	"/account",
	"/api/assets",
	"/api/auth/**",
	"/api/bind/**",
	"/api/cache/**",
	"/api/charts",
	"/api/leaderboard",
	"/api/locale",
	"/api/login/**",
	"/api/manual",
	"/api/me",
	"/api/notes",
	"/api/phira",
	"/api/refresh",
	"/api/share",
	"/api/songs/**",
	"/api/public/?slug?/route",
	"/api/unbind",
	"/files",
	"/home",
	"/login/**",
	"/me",
	"/me/**",
	"/p/**",
	"/phira",
	"/privacy",
	"/score",
	"/songs",
	"/status",
	"/tags",
	"/tos",
];
export const renderFonts = ["phi-assets/html/common/font/**", "src/fonts/**"];
// next/font copies these into the static build; no function reads them
const webFonts = [
	"src/fonts/noto-sans-sc-500.woff2",
	"src/fonts/noto-sans-sc-600.woff2",
	"src/fonts/outfit-*",
	"src/fonts/OFL-*",
];

const nextConfig: NextConfig = {
	agentRules: false,
	poweredByHeader: false,
	outputFileTracingRoot: dir,
	outputFileTracingIncludes: {
		"/api/card/*": phiRenderAssets,
		"/api/card/[kind]": phiRenderAssets,
		"/api/card/[kind]/route": phiRenderAssets,
		"/api/public/*/card/*": phiRenderAssets,
		"/api/public/[slug]/card/[kind]": phiRenderAssets,
		"/api/public/[slug]/card/[kind]/route": phiRenderAssets,
		"/api/refresh": phiInfoOnly,
		"/api/bind/poll": phiInfoOnly,
		"/api/bind/token": phiInfoOnly,
		// Finishing a TapTap sign-in binds the save, like /api/bind/poll
		"/api/login/taptap/poll": phiInfoOnly,
		"/api/charts": phiInfoOnly,
		"/api/manual": phiInfoOnly,
		"/api/songs/search": phiInfoOnly,
		"/api/songs/search/route": phiInfoOnly,
	},
	outputFileTracingExcludes: {
		"/**": [
			"ill-sync/**",
			"scripts/**",
			"phi-assets/html/**/*.js",
			"phi-assets/original_ill/**",
			// public/ is served by the CDN; only the kv.ts whole-project trace would pull it in
			"public/**",
			"**/*.tsbuildinfo",
			...foreignBinaries,
			...webFonts,
		],
		...Object.fromEntries(nonCardRoutes.map((route) => [route, renderFonts])),
	},
	serverExternalPackages: [
		"undici",
		"takumi-js",
		"takumi-js/helpers/html",
		"@takumi-rs/core",
		"@takumi-rs/helpers",
		"art-template",
		"jszip",
		"yaml",
		"qrcode",
		"sharp",
	],
	experimental: {
		optimizePackageImports: ["@phosphor-icons/react"],
	},
	turbopack: {
		root: dir,
	},
};

export default nextConfig;
