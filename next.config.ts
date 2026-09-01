import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

const phiRenderAssets = ["./phi-assets/html/**/*", "./phi-assets/info/**/*"];
const phiInfoOnly = ["./phi-assets/info/**/*"];
const phiFonts = ["./phi-assets/html/common/font/**/*", "./src/fonts/**/*"];

const nextConfig: NextConfig = {
	agentRules: false,
	poweredByHeader: false,
	outputFileTracingRoot: dir,
	outputFileTracingIncludes: {
		"/*": phiFonts,
		"/api/card/*": phiRenderAssets,
		"/api/card/[kind]": phiRenderAssets,
		"/api/card/[kind]/route": phiRenderAssets,
		"/api/public/*/card/*": phiRenderAssets,
		"/api/public/[slug]/card/[kind]": phiRenderAssets,
		"/api/public/[slug]/card/[kind]/route": phiRenderAssets,
		"/api/refresh": phiInfoOnly,
		"/api/bind/poll": phiInfoOnly,
		"/api/bind/token": phiInfoOnly,
	},
	outputFileTracingExcludes: {
		"*": [
			"./ill-sync/**",
			"./scripts/**",
			"./phi-assets/html/**/*.js",
			"./phi-assets/original_ill/**",
		],
	},
	serverExternalPackages: [
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
