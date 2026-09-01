import { join } from "node:path";
import { appRoot, assetsDir, dataDir } from "./paths";
import type { AppConfig } from "./sdk";

export function loadWebConfig(): AppConfig {
	return {
		discord: {
			token: "",
			clientId: process.env.AUTH_DISCORD_ID || "",
			guildId: "",
		},
		admins: [],
		owners: [],
		kv: {
			accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "",
			namespaceId: process.env.CLOUDFLARE_KV_NAMESPACE_ID?.trim() || "",
			apiToken: process.env.CLOUDFLARE_API_TOKEN?.trim() || "",
		},
		paths: {
			data: dataDir(),
			plugins: join(appRoot(), "src/phi"),
			phiResources: assetsDir(),
		},
		render: { format: "png", quality: 90, width: 1200, scale: 1 },
	};
}
