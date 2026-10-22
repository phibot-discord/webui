import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** Vercel hands its build the commit; a local build asks git, and has none outside a checkout */
export function commitSha(): string {
	const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
	if (fromVercel) return fromVercel;
	try {
		return execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: dir,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return "";
	}
}

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
	"/account/**",
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
	"/api/migrate/**",
	"/api/notes",
	"/api/phira",
	"/api/phira/extras",
	"/api/refresh",
	"/api/share",
	"/api/sim",
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
	"/render/**",
	"/score",
	"/simulate",
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
	env: { NEXT_PUBLIC_COMMIT_SHA: commitSha() },
	outputFileTracingRoot: dir,
	outputFileTracingIncludes: {
		"/api/card/*": phiRenderAssets,
		"/api/card/[kind]": phiRenderAssets,
		"/api/card/[kind]/route": phiRenderAssets,
		"/api/public/*/card/*": phiRenderAssets,
		"/api/public/[slug]/card/[kind]": phiRenderAssets,
		"/api/public/[slug]/card/[kind]/route": phiRenderAssets,
		"/api/og/*": phiRenderAssets,
		"/api/og/[id]": phiRenderAssets,
		"/api/og/[id]/route": phiRenderAssets,
		"/api/og/share/*/*": phiRenderAssets,
		"/api/og/share/[slug]/[kind]": phiRenderAssets,
		"/api/og/share/[slug]/[kind]/route": phiRenderAssets,
		"/api/refresh": phiInfoOnly,
		"/api/bind/poll": phiInfoOnly,
		"/api/bind/token": phiInfoOnly,
		"/api/login/taptap/poll": phiInfoOnly,
		"/api/charts": phiInfoOnly,
		"/api/manual": phiInfoOnly,
		"/api/sim": phiInfoOnly,
		"/api/songs/search": phiInfoOnly,
		"/api/songs/search/route": phiInfoOnly,
	},
	outputFileTracingExcludes: {
		"/**": [
			"ill-sync/**",
			"scripts/**",
			"phi-assets/html/**/*.js",
			"phi-assets/original_ill/**",
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
